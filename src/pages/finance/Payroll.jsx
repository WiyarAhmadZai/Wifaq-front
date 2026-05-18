import { useEffect, useMemo, useState } from "react";
import {
  listPayrollRuns, getPayrollRun, previewPayroll,
  commitPayroll, payPayrollRun, payPayslip,
} from "../../api/payroll";
import { getAccounts } from "../../api/financial";
import Swal from "sweetalert2";

const fmt = (n) => Number(n || 0).toLocaleString();
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const now = new Date();

const ROW_STATE = {
  ready:       { label: "Ready",        cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  blocked:     { label: "Blocked",      cls: "bg-red-50 text-red-700 border-red-200" },
  already_run: { label: "Already run",  cls: "bg-gray-100 text-gray-500 border-gray-200" },
};

export default function Payroll() {
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

  const pickAccount = async (title) => {
    if (accounts.length === 0) {
      Swal.fire("No accounts", "Add a cash/bank account first.", "warning");
      return null;
    }
    const { value } = await Swal.fire({
      title,
      input: "select",
      inputOptions: Object.fromEntries(accounts.map((a) => [a.id, `${a.account_name} (${fmt(a.current_balance)} AFN)`])),
      inputPlaceholder: "Pick the paying account",
      showCancelButton: true,
      confirmButtonColor: "#0d9488",
      inputValidator: (v) => !v && "Pick an account",
    });
    return value || null;
  };

  const paySlipNow = async (slip) => {
    const accId = await pickAccount(`Pay ${fmt(slip.net_pay)} AFN — payslip #${slip.id}`);
    if (!accId) return;
    try {
      await payPayslip(slip.id, { paid_from_account_id: Number(accId) });
      await openRun(activeRun.id);
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Paid", timer: 1300, showConfirmButton: false });
    } catch (e) {
      Swal.fire("Failed", e.response?.data?.message || "Payment failed.", "error");
    }
  };

  const payAll = async () => {
    const pending = (activeRun.payslips || []).filter((s) => s.status === "pending");
    if (pending.length === 0) return;
    const accId = await pickAccount(`Pay all ${pending.length} pending payslips`);
    if (!accId) return;
    try {
      await payPayrollRun(activeRun.id, { paid_from_account_id: Number(accId) });
      await openRun(activeRun.id);
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "All paid", timer: 1500, showConfirmButton: false });
    } catch (e) {
      Swal.fire("Failed", e.response?.data?.message || "Payment failed.", "error");
    }
  };

  const totals = useMemo(() => {
    if (!preview) return null;
    let g = 0, a = 0, d = 0, n = 0;
    preview.rows.forEach((r) => {
      if (r.status !== "ready" || edits[r.staff_id]?.skip) return;
      const man = (edits[r.staff_id]?.manual || []).reduce((s, m) => s + (Number(m.amount) || 0), 0);
      g += Number(r.gross_salary); a += Number(r.allowances_total);
      d += Number(r.advance_offset) + man;
      n += Number(r.gross_salary) + Number(r.allowances_total) - Number(r.advance_offset) - man;
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
            {pendingCount > 0 && (
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
                <th className="text-right px-3 py-2">Advance offset</th>
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
                    {s.staff?.employee_id || `#${s.staff_id}`}
                    <span className="block text-[10px] text-gray-400 font-mono">{s.party?.party_code}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(s.gross_salary)}</td>
                  <td className="px-3 py-2 text-right font-mono text-gray-600">{fmt(s.allowances_total)}</td>
                  <td className="px-3 py-2 text-right font-mono text-amber-700">{s.advance_offset > 0 ? `−${fmt(s.advance_offset)}` : "—"}</td>
                  <td className="px-3 py-2 text-right font-mono text-amber-700">{s.manual_deductions_total > 0 ? `−${fmt(s.manual_deductions_total)}` : "—"}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-teal-700">{fmt(s.net_pay)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      s.status === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>{s.status}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {s.status === "pending"
                      ? <button onClick={() => paySlipNow(s)} className="px-2 py-1 text-[10px] font-semibold text-white bg-teal-600 rounded hover:bg-teal-700">Pay</button>
                      : <span className="text-[10px] text-gray-400">{s.paid_from_account?.account_name || "paid"}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
          {preview && totals && (
            <button onClick={commit} disabled={committing || totals.n <= 0}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-semibold disabled:opacity-50">
              {committing ? "Committing…" : `Commit — net ${fmt(totals.n)} AFN`}
            </button>
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
                <th className="text-right px-3 py-2">Advance offset</th>
                <th className="text-left px-3 py-2">Manual deduction</th>
                <th className="text-right px-3 py-2">Net pay</th>
                <th className="text-center px-3 py-2">Status / Skip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {preview.rows.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-xs text-gray-400 italic">No active staff for this period.</td></tr>
              ) : preview.rows.map((r) => {
                const st = ROW_STATE[r.status] || ROW_STATE.ready;
                const e = edits[r.staff_id] || {};
                const man = (e.manual?.[0]?.amount) || 0;
                const net = r.status === "ready"
                  ? Number(r.gross_salary) + Number(r.allowances_total) - Number(r.advance_offset) - Number(man)
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
                    <td className="px-3 py-2 text-right font-mono text-amber-700">{r.advance_offset > 0 ? `−${fmt(r.advance_offset)}` : "—"}</td>
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
                  <td colSpan={2} className="px-3 py-2 text-right font-mono text-amber-700">−{fmt(totals.d)}</td>
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
