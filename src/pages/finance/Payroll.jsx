import { useEffect, useMemo, useState } from "react";
import {
  listPayrollRuns, getPayrollRun, previewPayroll,
  commitPayroll, payPayrollRun, payPayslip,
} from "../../api/payroll";
import { getAccounts } from "../../api/financial";
import Swal from "sweetalert2";
import { useAuth } from "../../admin/context/AuthContext";

const fmt = (n) => Number(n || 0).toLocaleString();
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const now = new Date();

const ROW_STATE = {
  ready:       { label: "Ready",        cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  blocked:     { label: "Blocked",      cls: "bg-red-50 text-red-700 border-red-200" },
  already_run: { label: "Already run",  cls: "bg-gray-100 text-gray-500 border-gray-200" },
};

export default function Payroll() {
  const { hasPermission } = useAuth();
  // Two distinct privileged actions on this screen:
  //   • commit         — accrues salaries + posts JEs
  //   • pay (all/each) — disburses cash from a bank account
  // Both gated by payroll.create (or .manage as override). Preview is just a
  // read query so it stays open to anyone with payroll.view (route gate).
  const canCommit = hasPermission("payroll.create") || hasPermission("payroll.manage");
  const canPay    = hasPermission("payroll.create") || hasPermission("payroll.manage");
  const [view, setView] = useState("builder");      // builder | run
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [preview, setPreview] = useState(null);
  const [edits, setEdits] = useState({});            // staffId → { skip, manual:[{label,amount}] }
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);

  const [runs, setRuns] = useState([]);
  const [activeRun, setActiveRun] = useState(null);
  const [accounts, setAccounts] = useState([]);

  // Payment dialog state. We drive the account-picker and the receipt with
  // plain React state instead of SweetAlert popups so we can ship a richer
  // UI (account tiles with balances, a printable A5 receipt afterwards).
  //   picker  = { kind: 'one'|'all', slip?, payslips? } | null
  //   receipt = { kind, payslips, account, paidAt }    | null
  const [picker, setPicker] = useState(null);
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    fetchRuns();
    getAccounts({ per_page: 100 })
      .then((r) => setAccounts(r.data?.data?.data || r.data?.data || []))
      .catch(() => setAccounts([]));
  }, []);

  const fetchRuns = async () => {
    try {
      const r = await listPayrollRuns({ per_page: 50 });
      setRuns(r.data?.data?.data || r.data?.data || []);
    } catch { setRuns([]); }
  };

  const runPreview = async () => {
    setLoading(true);
    try {
      const r = await previewPayroll({ period_year: year, period_month: month });
      setPreview(r.data?.data || null);
      setEdits({});
    } catch (e) {
      Swal.fire("Failed", e.response?.data?.message || "Preview failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const setManual = (staffId, label, amount) => {
    setEdits((p) => ({
      ...p,
      [staffId]: {
        ...p[staffId],
        manual: amount > 0 || label ? [{ label: label || "Deduction", amount: Number(amount) || 0 }] : [],
      },
    }));
  };
  const toggleSkip = (staffId) =>
    setEdits((p) => ({ ...p, [staffId]: { ...p[staffId], skip: !p[staffId]?.skip } }));

  const commit = async () => {
    const ready = preview.rows.filter((r) => r.status === "ready" && !edits[r.staff_id]?.skip).length;
    const c = await Swal.fire({
      title: "Commit payroll?",
      html: `<p style="font-size:13px">This accrues salaries for <b>${ready}</b> staff for <b>${MONTHS[month-1]} ${year}</b> and posts the journal entries. Payslips can then be paid.</p>`,
      icon: "question", showCancelButton: true, confirmButtonText: "Commit", confirmButtonColor: "#0d9488",
    });
    if (!c.isConfirmed) return;
    setCommitting(true);
    try {
      const per_staff = {};
      Object.entries(edits).forEach(([sid, e]) => {
        per_staff[sid] = { skip: !!e.skip, manual_deductions: (e.manual || []).filter((m) => m.amount > 0) };
      });
      const r = await commitPayroll({ period_year: year, period_month: month, per_staff });
      Swal.fire("Committed", r.data?.message || "Payroll committed.", "success");
      setPreview(null);
      await fetchRuns();
      openRun(r.data?.data?.id);
    } catch (e) {
      Swal.fire("Failed", e.response?.data?.message || "Commit failed.", "error");
    } finally {
      setCommitting(false);
    }
  };

  const openRun = async (id) => {
    if (!id) return;
    try {
      const r = await getPayrollRun(id);
      setActiveRun(r.data?.data || null);
      setView("run");
    } catch {
      Swal.fire("Error", "Could not load that run.", "error");
    }
  };

  // Open the redesigned account-picker for a single payslip.
  const paySlipNow = (slip) => {
    if (accounts.length === 0) {
      Swal.fire("No accounts", "Add a cash/bank account first.", "warning");
      return;
    }
    setPicker({ kind: "one", slip });
  };

  // Open the picker for the bulk "pay everyone pending" flow.
  const payAll = () => {
    const pending = (activeRun.payslips || []).filter((s) => s.status === "pending");
    if (pending.length === 0) return;
    if (accounts.length === 0) {
      Swal.fire("No accounts", "Add a cash/bank account first.", "warning");
      return;
    }
    setPicker({ kind: "all", payslips: pending });
  };

  // Confirm handler shared by both single + bulk flows. On success we close
  // the picker, refresh the run so balances/statuses update, and open the
  // printable receipt for the user to keep or hand to the staff member.
  const confirmPayment = async (accountId) => {
    if (!picker) return;
    const account = accounts.find((a) => String(a.id) === String(accountId));
    setPaying(true);
    try {
      if (picker.kind === "one") {
        await payPayslip(picker.slip.id, { paid_from_account_id: Number(accountId) });
      } else {
        await payPayrollRun(activeRun.id, { paid_from_account_id: Number(accountId) });
      }
      // Refresh activeRun so the table reflects "paid".
      const r = await getPayrollRun(activeRun.id);
      const fresh = r.data?.data || null;
      setActiveRun(fresh);

      // Open the printable receipt.
      setReceipt({
        kind: picker.kind,
        slip: picker.kind === "one" ? picker.slip : null,
        payslips: picker.kind === "all" ? picker.payslips : [picker.slip],
        account,
        paidAt: new Date(),
        run: fresh,
      });
      setPicker(null);
    } catch (e) {
      Swal.fire("Failed", e.response?.data?.message || "Payment failed.", "error");
    } finally {
      setPaying(false);
    }
  };

  const totals = useMemo(() => {
    if (!preview) return null;
    let g = 0, a = 0, d = 0, n = 0;
    preview.rows.forEach((r) => {
      if (r.status !== "ready" || edits[r.staff_id]?.skip) return;
      const man = (edits[r.staff_id]?.manual || []).reduce((s, m) => s + (Number(m.amount) || 0), 0);
      g += Number(r.gross_salary); a += Number(r.allowances_total);
      d += man;
      n += Number(r.gross_salary) + Number(r.allowances_total) - man;
    });
    return { g, a, d, n };
  }, [preview, edits]);

  // ───────────────────────── Run detail view
  if (view === "run" && activeRun) {
    const slips = activeRun.payslips || [];
    const pendingCount = slips.filter((s) => s.status === "pending").length;
    return (
      <div className="px-4 py-4 max-w-5xl mx-auto">
        <button onClick={() => { setView("builder"); setActiveRun(null); }}
          className="text-xs text-teal-600 hover:text-teal-800 mb-3">← Back to payroll</button>
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-800">Payroll — {MONTHS[activeRun.period_month-1]} {activeRun.period_year}</h2>
            <p className="text-xs text-gray-500">{activeRun.branch?.name || "All branches"} · {activeRun.payslips_created} payslip(s) · committed {activeRun.committed_at?.slice(0,10)}</p>
          </div>
          <div className="flex items-center gap-4 text-right">
            <Stat label="Gross" v={activeRun.total_gross} />
            <Stat label="Deductions" v={activeRun.total_deductions} />
            <Stat label="Net" v={activeRun.total_net} strong />
            {pendingCount > 0 && canPay && (
              <button onClick={payAll} className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-semibold">
                Pay all ({pendingCount})
              </button>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-[11px]">
            <thead className="bg-gray-50 text-gray-500 uppercase text-[9px]">
              <tr>
                <th className="text-left px-3 py-2">Staff</th>
                <th className="text-right px-3 py-2">Gross</th>
                <th className="text-right px-3 py-2">Allowances</th>
                <th className="text-right px-3 py-2">Manual ded.</th>
                <th className="text-right px-3 py-2">Net pay</th>
                <th className="text-center px-3 py-2">Status</th>
                <th className="text-center px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {slips.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-800">
                    {/* Full staff name on top, employee_id on the second
                        line. `full_name` is a Staff accessor backed by the
                        linked Application; party code intentionally NOT
                        shown — payroll no longer flows through Party. */}
                    {s.staff?.full_name || s.staff?.employee_id || `Staff #${s.staff_id}`}
                    {s.staff?.employee_id && s.staff?.full_name && (
                      <span className="block text-[10px] text-gray-400 font-mono">{s.staff.employee_id}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(s.gross_salary)}</td>
                  <td className="px-3 py-2 text-right font-mono text-gray-600">{fmt(s.allowances_total)}</td>
                  <td className="px-3 py-2 text-right font-mono text-amber-700">{s.manual_deductions_total > 0 ? `−${fmt(s.manual_deductions_total)}` : "—"}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-teal-700">{fmt(s.net_pay)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      s.status === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>{s.status}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {s.status === "pending"
                      ? (canPay
                          ? <button onClick={() => paySlipNow(s)} className="px-2 py-1 text-[10px] font-semibold text-white bg-teal-600 rounded hover:bg-teal-700">Pay</button>
                          : <span className="text-[10px] text-gray-400">pending</span>)
                      : <span className="text-[10px] text-gray-400">{s.paid_from_account?.account_name || "paid"}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {picker && (
          <AccountPickerModal
            picker={picker}
            accounts={accounts}
            paying={paying}
            run={activeRun}
            onConfirm={confirmPayment}
            onClose={() => !paying && setPicker(null)}
          />
        )}

        {receipt && (
          <PayrollReceiptModal
            receipt={receipt}
            run={activeRun}
            onClose={() => setReceipt(null)}
          />
        )}
      </div>
    );
  }

  // ───────────────────────── Builder view
  return (
    <div className="px-4 py-4 max-w-6xl mx-auto">
      <div className="mb-4">
        <h2 className="text-base font-bold text-gray-800">Payroll</h2>
        <p className="text-xs text-gray-500">Generate monthly salaries for all active staff. Salary comes from each staff member's active contract; outstanding advances net off automatically.</p>
      </div>

      {/* Builder */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Year</label>
            <input type="number" value={year} onChange={(e) => setYear(+e.target.value)}
              className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Month</label>
            <select value={month} onChange={(e) => setMonth(+e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500">
              {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
            </select>
          </div>
          <button onClick={runPreview} disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-semibold disabled:opacity-50">
            {loading ? "Loading…" : "Preview"}
          </button>
          {preview && totals && canCommit && (
            <button onClick={commit} disabled={committing || totals.n <= 0}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-semibold disabled:opacity-50">
              {committing ? "Committing…" : `Commit — net ${fmt(totals.n)} AFN`}
            </button>
          )}
          {preview && totals && !canCommit && (
            <p className="text-[11px] text-gray-500 self-center">You can preview payroll, but don't have permission to commit it.</p>
          )}
        </div>
      </div>

      {preview && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
          <table className="w-full text-[11px]">
            <thead className="bg-gray-50 text-gray-500 uppercase text-[9px]">
              <tr>
                <th className="text-left px-3 py-2">Staff</th>
                <th className="text-left px-3 py-2">Dept</th>
                <th className="text-right px-3 py-2">Gross</th>
                <th className="text-right px-3 py-2">Allowances</th>
                <th className="text-left px-3 py-2">Manual deduction</th>
                <th className="text-right px-3 py-2">Net pay</th>
                <th className="text-center px-3 py-2">Status / Skip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {preview.rows.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-xs text-gray-400 italic">No active staff for this period.</td></tr>
              ) : preview.rows.map((r) => {
                const st = ROW_STATE[r.status] || ROW_STATE.ready;
                const e = edits[r.staff_id] || {};
                const man = (e.manual?.[0]?.amount) || 0;
                const net = r.status === "ready"
                  ? Number(r.gross_salary) + Number(r.allowances_total) - Number(man)
                  : 0;
                const skipped = !!e.skip;
                return (
                  <tr key={r.staff_id} className={`hover:bg-gray-50 ${skipped ? "opacity-40" : ""} ${r.status !== "ready" ? "bg-gray-50/50" : ""}`}>
                    <td className="px-3 py-2 font-medium text-gray-800">
                      {r.staff_name}<span className="block text-[10px] text-gray-400 font-mono">{r.employee_id}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{r.department || "—"}</td>
                    <td className="px-3 py-2 text-right font-mono">{r.status === "ready" ? fmt(r.gross_salary) : "—"}</td>
                    <td className="px-3 py-2 text-right font-mono text-gray-600">{r.status === "ready" ? fmt(r.allowances_total) : "—"}</td>
                    <td className="px-3 py-2">
                      {r.status === "ready" && !skipped ? (
                        <div className="flex gap-1">
                          <input placeholder="label" defaultValue={e.manual?.[0]?.label || ""}
                            onBlur={(ev) => setManual(r.staff_id, ev.target.value, man)}
                            className="w-20 px-1.5 py-1 text-[10px] border border-gray-200 rounded" />
                          <input type="number" placeholder="0" defaultValue={man || ""}
                            onBlur={(ev) => setManual(r.staff_id, e.manual?.[0]?.label || "Deduction", ev.target.value)}
                            className="w-16 px-1.5 py-1 text-[10px] text-right border border-gray-200 rounded" />
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-teal-700">{r.status === "ready" ? fmt(net) : "—"}</td>
                    <td className="px-3 py-2 text-center">
                      {r.status === "ready" ? (
                        <label className="inline-flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer">
                          <input type="checkbox" checked={skipped} onChange={() => toggleSkip(r.staff_id)}
                            className="rounded text-teal-600 focus:ring-teal-500" /> skip
                        </label>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${st.cls}`} title={r.issues?.join("; ")}>{st.label}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {totals && (
              <tfoot>
                <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                  <td colSpan={2} className="px-3 py-2 text-right text-[10px] uppercase text-gray-500">Totals</td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(totals.g)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(totals.a)}</td>
                  <td className="px-3 py-2 text-right font-mono text-amber-700">{totals.d > 0 ? `−${fmt(totals.d)}` : "—"}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-teal-700">{fmt(totals.n)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* Recent runs */}
      <h3 className="text-sm font-bold text-gray-800 mb-2">Recent payroll runs</h3>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-[11px]">
          <thead className="bg-gray-50 text-gray-500 uppercase text-[9px]">
            <tr>
              <th className="text-left px-3 py-2">Period</th>
              <th className="text-left px-3 py-2">Branch</th>
              <th className="text-right px-3 py-2">Payslips</th>
              <th className="text-right px-3 py-2">Net</th>
              <th className="text-left px-3 py-2">Committed</th>
              <th className="text-center px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {runs.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-6 text-xs text-gray-400 italic">No payroll runs yet.</td></tr>
            ) : runs.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openRun(r.id)}>
                <td className="px-3 py-2 font-medium text-gray-800">{MONTHS[r.period_month-1]} {r.period_year}</td>
                <td className="px-3 py-2 text-gray-500">{r.branch?.name || "All branches"}</td>
                <td className="px-3 py-2 text-right">{r.payslips_created}</td>
                <td className="px-3 py-2 text-right font-mono font-semibold">{fmt(r.total_net)} AFN</td>
                <td className="px-3 py-2 text-gray-500">{r.committed_at?.slice(0,10)}</td>
                <td className="px-3 py-2 text-center"><span className="text-[10px] text-teal-600">Open →</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, v, strong }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`font-mono ${strong ? "text-base font-bold text-teal-700" : "text-xs text-gray-700"}`}>{fmt(v)}</p>
    </div>
  );
}

// ───────────────────────────────────────────────────────────── Account picker
// Custom replacement for the old Swal.fire({input:'select'}) — gives us
// account tiles with balances, the amount being paid up top, and a clean
// list UX. Closes on backdrop click (when not mid-request).
function AccountPickerModal({ picker, accounts, paying, run, onConfirm, onClose }) {
  const isBulk = picker.kind === "all";
  const slips = isBulk ? picker.payslips : [picker.slip];
  const total = slips.reduce((s, p) => s + Number(p.net_pay || 0), 0);
  const [selected, setSelected] = useState(null);

  return (
    <div
      className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header — teal gradient with the amount called out */}
        <div className="px-6 py-5 bg-gradient-to-br from-teal-600 to-emerald-700 text-white">
          <p className="text-[10px] uppercase font-bold tracking-wider text-teal-100">
            {isBulk ? `Pay ${slips.length} payslips` : `Pay payslip #${picker.slip.id}`}
          </p>
          <p className="text-3xl font-bold mt-1 font-mono">{fmt(total)} <span className="text-sm font-normal">AFN</span></p>
          {!isBulk && (
            <p className="text-[11px] text-teal-100 mt-1">
              {picker.slip.staff?.employee_id ? `to ${picker.slip.staff.employee_id}` : ""}
              {run && ` · ${MONTHS[run.period_month - 1]} ${run.period_year}`}
            </p>
          )}
        </div>

        {/* Body — account tile list */}
        <div className="p-5">
          <p className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-3">
            Pay from which account?
          </p>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {accounts.map((a) => {
              const sel = String(selected) === String(a.id);
              const insufficient = Number(a.current_balance) < total;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelected(a.id)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${
                    sel
                      ? "bg-teal-50 border-teal-500 ring-2 ring-teal-200"
                      : "bg-white border-gray-200 hover:border-teal-300"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      sel ? "border-teal-600" : "border-gray-300"
                    }`}>
                      {sel && <span className="w-2 h-2 rounded-full bg-teal-600" />}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${sel ? "text-teal-800" : "text-gray-800"}`}>{a.account_name}</p>
                      <p className="text-[11px] text-gray-400 capitalize">{a.account_type}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-xs font-mono font-semibold ${insufficient ? "text-amber-700" : "text-gray-700"}`}>
                      {fmt(a.current_balance)} AFN
                    </p>
                    {insufficient && (
                      <p className="text-[9px] text-amber-700 mt-0.5">⚠ short of total</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50">
          <button
            type="button"
            disabled={paying}
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selected || paying}
            onClick={() => onConfirm(selected)}
            className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            {paying ? "Processing…" : `Pay ${fmt(total)} AFN`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────── Printable receipt
// Bank-style A5 receipt. Single mode shows one staff member's breakdown
// (gross / allowances / deductions / net). Bulk mode shows a table of all
// payees with their net amounts and a grand total. Print button uses
// window.print(); the @media-print rules below hide everything except this
// receipt, so the printed page is just the bill.
function PayrollReceiptModal({ receipt, run, onClose }) {
  const isBulk = receipt.kind === "all";
  const total = receipt.payslips.reduce((s, p) => s + Number(p.net_pay || 0), 0);
  const refNumber = isBulk
    ? `PAYRUN-${run?.id || "?"}-${receipt.paidAt.toISOString().slice(0, 10).replace(/-/g, "")}`
    : `PAY-${receipt.slip.id}-${receipt.paidAt.toISOString().slice(0, 10).replace(/-/g, "")}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:bg-white print:p-0"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Print-only CSS — when the user clicks Print, only #payroll-receipt
          stays visible. A5 portrait keeps it teller-receipt sized. */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #payroll-receipt, #payroll-receipt * { visibility: visible !important; }
          #payroll-receipt { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; box-shadow: none !important; border: none !important; }
          .print\\:hidden { display: none !important; }
          @page { size: A5 portrait; margin: 8mm; }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header bar — hidden during print */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50 print:hidden">
          <h3 className="text-sm font-bold text-gray-800">Payment receipt</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>

        {/* The actual receipt */}
        <div id="payroll-receipt" className="p-6 overflow-y-auto bg-white text-gray-800" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
          <div className="text-center border-b-2 border-gray-300 border-double pb-3 mb-4">
            <h2 className="text-base font-bold tracking-wide">WIFAQ SCHOOL</h2>
            <p className="text-[10px] text-gray-500">PAYROLL DISBURSEMENT RECEIPT</p>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-y-1 text-[11px] mb-4">
            <span className="text-gray-500">Receipt #</span>
            <span className="text-right font-semibold">{refNumber}</span>

            <span className="text-gray-500">Date</span>
            <span className="text-right">{receipt.paidAt.toLocaleDateString()} {receipt.paidAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>

            <span className="text-gray-500">Period</span>
            <span className="text-right">
              {run ? `${MONTHS[run.period_month - 1]} ${run.period_year}` : "—"}
            </span>

            <span className="text-gray-500">Paid from</span>
            <span className="text-right font-semibold">{receipt.account?.account_name || "—"}</span>
          </div>

          {/* Body — single payslip breakdown OR bulk table */}
          {!isBulk ? (
            <SinglePayslipBody slip={receipt.slip} />
          ) : (
            <BulkPayslipsBody payslips={receipt.payslips} />
          )}

          {/* Grand total */}
          <div className="mt-4 pt-3 border-t-2 border-gray-300 border-double flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700">Total paid</span>
            <span className="text-lg font-bold">{fmt(total)} AFN</span>
          </div>

          {/* Signatures */}
          <div className="mt-8 grid grid-cols-2 gap-6 text-[10px] text-gray-500">
            <div>
              <div className="border-t border-gray-400 pt-1">Payer signature</div>
            </div>
            <div>
              <div className="border-t border-gray-400 pt-1 text-right">Recipient signature</div>
            </div>
          </div>

          <p className="text-[9px] text-gray-400 text-center mt-6">
            This receipt is generated automatically. Verify the amount above before signing.
          </p>
        </div>
      </div>
    </div>
  );
}

function SinglePayslipBody({ slip }) {
  return (
    <>
      <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Paid to</p>
      <p className="text-sm font-bold mb-3">
        {/* Staff `full_name` is an accessor on the Staff model — reads from
            the hire-time Application. Falls back to employee_id if absent. */}
        {slip.staff?.full_name || slip.staff?.employee_id || `Staff #${slip.staff_id}`}
        {slip.staff?.employee_id && slip.staff?.full_name && (
          <span className="block text-[10px] text-gray-500 font-normal">{slip.staff.employee_id}</span>
        )}
      </p>

      <div className="border-t border-gray-200 pt-3 text-[11px] space-y-1">
        <Line label="Gross salary"        value={slip.gross_salary} />
        <Line label="Allowances"          value={slip.allowances_total} />
        <Line label="Manual deductions"   value={-Number(slip.manual_deductions_total || 0)} muted={!Number(slip.manual_deductions_total)} />
        <div className="border-t border-gray-300 mt-2 pt-2 flex items-center justify-between font-bold">
          <span>Net pay</span>
          <span>{fmt(slip.net_pay)} AFN</span>
        </div>
      </div>
    </>
  );
}

function BulkPayslipsBody({ payslips }) {
  return (
    <>
      <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Payees ({payslips.length})</p>
      <table className="w-full text-[11px] border-t border-b border-gray-200">
        <thead>
          <tr className="text-left text-[9px] uppercase tracking-wider text-gray-500 border-b border-gray-100">
            <th className="py-1.5">Staff</th>
            <th className="py-1.5 text-right">Net</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {payslips.map((p) => (
            <tr key={p.id}>
              <td className="py-1.5">
                {/* Name on top, employee_id underneath — easier for the
                    payee to verify they're on the right line at a glance. */}
                {p.staff?.full_name || p.staff?.employee_id || `Staff #${p.staff_id}`}
                {p.staff?.employee_id && p.staff?.full_name && (
                  <span className="block text-[9px] text-gray-500">{p.staff.employee_id}</span>
                )}
              </td>
              <td className="py-1.5 text-right font-semibold">{fmt(p.net_pay)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Line({ label, value, muted }) {
  const negative = Number(value) < 0;
  return (
    <div className={`flex items-center justify-between ${muted ? "text-gray-400" : ""}`}>
      <span>{label}</span>
      <span className={negative ? "text-amber-700" : ""}>
        {negative ? "−" : ""}{fmt(Math.abs(Number(value) || 0))}
      </span>
    </div>
  );
}
