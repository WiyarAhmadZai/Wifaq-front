import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  listPayrollRuns, getPayrollRun, previewPayroll,
  commitPayroll, payPayrollRun, payPayslip,
  updatePayrollRun, deletePayrollRun, updatePayslip,
  getPayslip, setPayslipAdvance,
} from "../../api/payroll";
import { getAccounts } from "../../api/financial";
import { peekCache } from "../../api/axios";
import Swal from "sweetalert2";
import { useAuth } from "../../admin/context/AuthContext";
import BudgetWarningModal from "../../components/finance/BudgetWarningModal";

const fmt = (n) => Number(n || 0).toLocaleString();
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const now = new Date();

const ROW_STATE = {
  ready:       { label: "Ready",        cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  blocked:     { label: "Blocked",      cls: "bg-red-50 text-red-700 border-red-200" },
  already_run: { label: "Already run",  cls: "bg-gray-100 text-gray-500 border-gray-200" },
};

/**
 * Advance recovered from one preview row.
 *
 * The school lends staff money (an advance) and takes it back out of later
 * salaries. How much comes off in any given month is a decision, not a formula:
 * an advance far bigger than one salary is settled over many months, and the
 * split between cash-in-hand and repayment can differ every time.
 *
 *   no override typed  → advance_default, half the month's pay. NOT the whole
 *                        of it: someone whose advance dwarfs their salary would
 *                        otherwise take home nothing for months on end.
 *   a number typed     → that much, clamped to [0, advance_max]
 *
 * 0 means the staff member takes the whole salary home this month and the
 * advance is untouched; advance_max means they take nothing home and the
 * advance drops by a full salary. The server clamps identically.
 */
function advanceMaxOf(row) {
  return Number(row.advance_max ?? row.advance_deduction ?? 0);
}

function advanceDefaultOf(row) {
  const d = row.advance_default;
  return d === undefined || d === null ? advanceMaxOf(row) : Number(d);
}

function advanceFor(row, edit) {
  const max = advanceMaxOf(row);
  const v = edit?.advance;
  if (v === undefined || v === null || v === "") return Math.min(advanceDefaultOf(row), max);
  return Math.min(Math.max(0, Number(v) || 0), max);
}

export default function Payroll() {
  const { hasPermission, isSuperAdmin } = useAuth();
  // Four distinct privileged actions on this screen:
  //   • commit         — accrues salaries + posts JEs        → payroll.create
  //   • pay (all/each) — disburses cash from a bank account   → payroll.create
  //   • edit           — corrects a still-pending payslip     → payroll.update
  //   • delete         — removes an unpaid payslip or run     → payroll.delete
  //   • advance        — splits pay between cash and advance  → payroll.advance
  //   • print          — opens the A5 payslip document        → payroll.print
  // `.manage` is the catch-all that satisfies all of them. Preview is just a
  // read query so it stays open to anyone with payroll.view (route gate).
  const canManage  = hasPermission("payroll.manage");
  const canCommit  = hasPermission("payroll.create") || canManage;
  const canPay     = hasPermission("payroll.create") || canManage;
  const canEdit    = hasPermission("payroll.update") || canManage;
  const canDelete  = hasPermission("payroll.delete") || canManage;
  const canAdvance = hasPermission("payroll.advance") || canManage;
  const canPrint   = hasPermission("payroll.print")   || canManage;

  // Deleting a run that has been paid out is NOT covered by payroll.delete.
  // Money has left the bank, so undoing it takes a super-admin — the server
  // enforces the same rule, this just stops the button being offered.
  //   paid unknown (list rows carry no payslips) → treat as unpaid; the server
  //   still refuses and says why.
  const canDeleteRun = (run, paidCount) => {
    if (!canDelete) return false;
    const paid = paidCount ?? (run?.payslips || []).filter((s) => s.status === "paid").length;
    return paid === 0 || isSuperAdmin;
  };
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

  // Soft-warn-and-override (Option B). When the commit endpoint returns a
  // 409 budget_breach we stash it here so the modal can render; confirming
  // the modal re-issues the same commit with `budget_override_reason`.
  const [budgetBreach, setBudgetBreach] = useState(null);
  const [overridingBudget, setOverridingBudget] = useState(false);
  const canOverrideBudget = hasPermission("budgets.override");

  useEffect(() => {
    fetchRuns();
    // Salaries are only ever paid from the Payroll Bank (chart 1112). The
    // backend enforces the same in PayrollService::paySlip().
    getAccounts({ per_page: 100, chart_codes: "1112" })
      .then((r) => setAccounts(r.data?.data?.data || r.data?.data || []))
      .catch(() => setAccounts([]));
  }, []);

  const fetchRuns = async () => {
    try {
      const __cached = peekCache('/financial/payroll-runs', { per_page: 50 });
      if (__cached) setRuns(__cached?.data?.data || __cached?.data || []);
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

  // How much of the outstanding advance this month claws back. `undefined`
  // means "leave it to the backend", which recovers as much as the month can
  // bear — the sensible default. A number (including 0) is an explicit
  // instruction and is clamped to advance_max on both sides.
  const setAdvance = (staffId, value) =>
    setEdits((p) => ({ ...p, [staffId]: { ...p[staffId], advance: value } }));

  // Submit the commit, optionally with a budget override reason. Used both
  // by the initial Commit click (no reason) and by the modal's Confirm
  // (with reason). On 409 + budget_breach we open the modal instead of
  // showing a generic error.
  const submitCommit = async (overrideReason) => {
    try {
      const per_staff = {};
      Object.entries(edits).forEach(([sid, e]) => {
        per_staff[sid] = {
          skip: !!e.skip,
          manual_deductions: (e.manual || []).filter((m) => m.amount > 0),
          // Only send an override when the user actually typed one — omitting
          // the key keeps the default "recover as much as possible".
          ...(e.advance === undefined || e.advance === null || e.advance === ""
            ? {}
            : { advance_recovery: Math.max(0, Number(e.advance) || 0) }),
        };
      });
      const payload = {
        period_year: year, period_month: month, per_staff,
        ...(overrideReason ? { budget_override_reason: overrideReason } : {}),
      };
      const r = await commitPayroll(payload);
      setBudgetBreach(null);
      Swal.fire("Committed", r.data?.message || "Payroll committed.", "success");
      setPreview(null);
      await fetchRuns();
      openRun(r.data?.data?.id);
    } catch (e) {
      if (e.response?.status === 409 && e.response.data?.budget_breach) {
        setBudgetBreach(e.response.data.budget_breach);
        return;
      }
      Swal.fire("Failed", e.response?.data?.message || "Commit failed.", "error");
    } finally {
      setCommitting(false);
      setOverridingBudget(false);
    }
  };

  const commit = async () => {
    const ready = preview.rows.filter((r) => r.status === "ready" && !edits[r.staff_id]?.skip).length;
    const c = await Swal.fire({
      title: "Commit payroll?",
      html: `<p style="font-size:13px">This accrues salaries for <b>${ready}</b> staff for <b>${MONTHS[month-1]} ${year}</b> and posts the journal entries. Payslips can then be paid.</p>`,
      icon: "question", showCancelButton: true, confirmButtonText: "Commit", confirmButtonColor: "#0d9488",
    });
    if (!c.isConfirmed) return;
    setCommitting(true);
    await submitCommit(null);
  };

  const handleBudgetOverride = async (reason) => {
    setOverridingBudget(true);
    await submitCommit(reason);
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

  // ── Correction / removal ───────────────────────────────────────────────
  // A committed run is only an accrual until it is paid, so a wrong figure can
  // still be corrected and a wrong run removed. Anything already paid is
  // refused server-side — cash that has left the bank needs a payment
  // reversal, not an edit.

  const [editingSlip, setEditingSlip] = useState(null);   // payslip being corrected
  const [savingSlip, setSavingSlip] = useState(false);
  const [busyRunId, setBusyRunId] = useState(null);       // run mid-delete
  const [advanceSlip, setAdvanceSlip] = useState(null);   // payslip whose advance split is being set
  const [savingAdvance, setSavingAdvance] = useState(false);
  const [payslipDoc, setPayslipDoc] = useState(null);     // { payslip, advance } for the A5 document
  const [loadingDoc, setLoadingDoc] = useState(false);

  const refreshActiveRun = async (id) => {
    const r = await getPayrollRun(id);
    setActiveRun(r.data?.data || null);
  };

  const saveSlipEdit = async (payload) => {
    setSavingSlip(true);
    try {
      await updatePayslip(editingSlip.id, payload);
      await refreshActiveRun(activeRun.id);
      await fetchRuns();
      setEditingSlip(null);
      Swal.fire("Saved", "Payslip updated and its journal entry re-stated.", "success");
    } catch (e) {
      Swal.fire("Failed", e.response?.data?.message || "Could not update the payslip.", "error");
    } finally {
      setSavingSlip(false);
    }
  };

  // Open the advance-settlement dialog. It needs the live advance position
  // (what was outstanding before this payslip touched it), which only the
  // payslip endpoint knows — so fetch rather than guess from the row.
  const openAdvance = async (slip) => {
    setLoadingDoc(true);
    try {
      const r = await getPayslip(slip.id);
      setAdvanceSlip({ slip: r.data?.data?.payslip || slip, advance: r.data?.data?.advance || null });
    } catch (e) {
      Swal.fire("Failed", e.response?.data?.message || "Could not load this payslip.", "error");
    } finally {
      setLoadingDoc(false);
    }
  };

  const saveAdvance = async (amount) => {
    setSavingAdvance(true);
    try {
      await setPayslipAdvance(advanceSlip.slip.id, { advance_recovery: amount });
      await refreshActiveRun(activeRun.id);
      await fetchRuns();
      setAdvanceSlip(null);
      Swal.fire("Saved", "Advance recovery updated — net pay and the journal entry were re-stated.", "success");
    } catch (e) {
      Swal.fire("Failed", e.response?.data?.message || "Could not update the advance recovery.", "error");
    } finally {
      setSavingAdvance(false);
    }
  };

  // A5 payslip document — the staff member's copy of what they were paid and
  // what is still owed on their advance.
  const openPayslipDoc = async (slip) => {
    setLoadingDoc(true);
    try {
      const r = await getPayslip(slip.id);
      setPayslipDoc(r.data?.data || null);
    } catch (e) {
      Swal.fire("Failed", e.response?.data?.message || "Could not load this payslip.", "error");
    } finally {
      setLoadingDoc(false);
    }
  };

  // Payslips are not removable on their own — they belong to their run and are
  // only cleared when that whole run is deleted (which reverses each accrual
  // and hands any recovered advance back to the staff ledger).
  const removeRun = async (run, { fromDetail = false } = {}) => {
    const paid = (run.payslips || []).filter((s) => s.status === "paid").length;
    const c = await Swal.fire({
      title: `Delete ${MONTHS[run.period_month - 1]} ${run.period_year} payroll?`,
      html: paid > 0
        ? `<p style="font-size:13px">${paid} payslip(s) here are already <b>paid</b>. Paid payslips cannot be deleted — reverse those payments first.</p>`
        : `<p style="font-size:13px">Every payslip in this run is removed and its accrual reversed. Any advances recovered by the run go back onto the staff ledgers. The period becomes free to run again.</p>`,
      icon: "warning", showCancelButton: true,
      confirmButtonText: "Delete run", confirmButtonColor: "#dc2626",
    });
    if (!c.isConfirmed) return;
    setBusyRunId(run.id);
    try {
      await deletePayrollRun(run.id);
      await fetchRuns();
      if (fromDetail) { setActiveRun(null); setView("builder"); }
      Swal.fire("Deleted", "Payroll run deleted.", "success");
    } catch (e) {
      Swal.fire("Failed", e.response?.data?.message || "Could not delete the run.", "error");
    } finally {
      setBusyRunId(null);
    }
  };

  const editRunNotes = async (run) => {
    const { value, isConfirmed } = await Swal.fire({
      title: "Run notes",
      input: "textarea",
      inputValue: run.notes || "",
      inputAttributes: { maxlength: 1000 },
      showCancelButton: true, confirmButtonText: "Save", confirmButtonColor: "#0d9488",
    });
    if (!isConfirmed) return;
    try {
      await updatePayrollRun(run.id, { notes: value || null });
      await refreshActiveRun(run.id);
      await fetchRuns();
    } catch (e) {
      Swal.fire("Failed", e.response?.data?.message || "Could not save the notes.", "error");
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
    let g = 0, a = 0, dman = 0, dleave = 0, dadv = 0, n = 0;
    preview.rows.forEach((r) => {
      if (r.status !== "ready" || edits[r.staff_id]?.skip) return;
      const man = (edits[r.staff_id]?.manual || []).reduce((s, m) => s + (Number(m.amount) || 0), 0);
      // The automatic leave/absence deduction is computed by the backend and
      // must be subtracted from net alongside manual deductions.
      const leave = Number(r.leave_deduction) || 0;
      // Outstanding advance recovered from this month's pay — the admin's
      // override when they set one, otherwise the automatic maximum.
      const adv = advanceFor(r, edits[r.staff_id]);
      g += Number(r.gross_salary); a += Number(r.allowances_total);
      dman += man; dleave += leave; dadv += adv;
      n += Number(r.gross_salary) + Number(r.allowances_total) - man - leave - adv;
    });
    return { g, a, dman, dleave, dadv, d: dman + dleave + dadv, n };
  }, [preview, edits]);

  // ───────────────────────── Run detail view
  if (view === "run" && activeRun) {
    const slips = activeRun.payslips || [];
    const pendingCount = slips.filter((s) => s.status === "pending").length;
    // A run with any paid payslip can't be deleted — the cash is already gone.
    const paidCount = slips.filter((s) => s.status === "paid").length;
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
            {canEdit && (
              <button onClick={() => editRunNotes(activeRun)}
                className="px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-xs font-semibold">
                Notes
              </button>
            )}
            {/* Once anything in the run is paid the button is GONE, not
                greyed — deleting paid payroll is a super-admin decision. */}
            {canDeleteRun(activeRun, paidCount) && (
              <button onClick={() => removeRun(activeRun, { fromDetail: true, paid: paidCount })}
                disabled={busyRunId === activeRun.id}
                title={paidCount > 0 ? "Super-admin: reverses the payments and puts the cash back" : "Delete this run"}
                className="px-3 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
                {busyRunId === activeRun.id ? "Deleting…" : paidCount > 0 ? "Delete run (paid)" : "Delete run"}
              </button>
            )}
          </div>
        </div>

        {paidCount > 0 && !isSuperAdmin && (
          <p className="mb-4 text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            {paidCount} payslip(s) in this run have been paid, so it can no longer be deleted.
            Only a super-admin can remove a payroll run once money has gone out.
          </p>
        )}

        {activeRun.notes && (
          <p className="mb-4 text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            {activeRun.notes}
          </p>
        )}

        {canEdit && slips.some((s) => s.status === "pending") && (
          <p className="mb-2 text-[11px] text-gray-500">
            Figures are corrected per payslip — use <strong className="text-indigo-600">Edit</strong> on a
            pending row below. Paid rows are locked.
          </p>
        )}

        {/* overflow-x-auto, not overflow-hidden: with Pay / Edit / Remove in
            the action column this table is wider than the card on a narrow
            window, and clipping it would cut the buttons off. */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full min-w-[760px] text-[11px]">
            <thead className="bg-gray-50 text-gray-500 uppercase text-[9px]">
              <tr>
                <th className="text-left px-3 py-2">Staff</th>
                <th className="text-right px-3 py-2">Gross</th>
                <th className="text-right px-3 py-2">Allowances</th>
                <th className="text-right px-3 py-2">Advance</th>
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
                  {/* Two different numbers, and the admin needs both: what came
                      off THIS salary, and what the staff member still owes on
                      the advance they were handed in the Parties screen. */}
                  <td className="px-3 py-2 text-right font-mono text-amber-700"
                      title={`Recovered from this salary: ${fmt(s.advance_offset)} · still owed after it: ${fmt(s.party?.balance ?? 0)}`}>
                    {Number(s.advance_offset) > 0 ? `−${fmt(s.advance_offset)}` : "—"}
                    {Number(s.party?.balance) > 0 && (
                      <span className="block text-[9px] text-gray-400 font-normal">
                        {fmt(s.party.balance)} still owed
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-amber-700">{s.manual_deductions_total > 0 ? `−${fmt(s.manual_deductions_total)}` : "—"}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-teal-700">{fmt(s.net_pay)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      s.status === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>{s.status}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      {s.status === "pending" ? (
                        <>
                          {canPay && (
                            <button onClick={() => paySlipNow(s)}
                              className="px-2 py-1 text-[10px] font-semibold text-white bg-teal-600 rounded hover:bg-teal-700">Pay</button>
                          )}
                          {/* Splits this month's pay between cash-in-hand and
                              advance repayment. Its own permission because it
                              changes what somebody still owes the school. */}
                          {canAdvance && (
                            <button onClick={() => openAdvance(s)} disabled={loadingDoc}
                              title="Set how much of the outstanding advance comes off this salary"
                              className="px-2 py-1 text-[10px] font-semibold text-amber-700 border border-amber-200 rounded hover:bg-amber-50 disabled:opacity-40">Advance</button>
                          )}
                          {canEdit && (
                            <button onClick={() => setEditingSlip(s)}
                              className="px-2 py-1 text-[10px] font-semibold text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-50">Edit</button>
                          )}
                          {/* No per-payslip Remove. A payslip is part of its
                              run, not a standalone record — it goes only when
                              the whole payroll run is deleted. */}
                        </>
                      ) : (
                        // Paid: locked for money changes. Editing or deleting
                        // disbursed pay would leave the bank and the books
                        // disagreeing — but the document is still printable.
                        <span className="text-[10px] text-gray-400">
                          {s.paid_from_account?.account_name || "paid"}
                        </span>
                      )}
                      {canPrint && (
                        <button onClick={() => openPayslipDoc(s)} disabled={loadingDoc}
                          title="Open the A5 payslip document"
                          className="px-2 py-1 text-[10px] font-semibold text-gray-600 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">Payslip</button>
                      )}
                      {!canPay && !canEdit && !canDelete && !canAdvance && !canPrint && s.status === "pending" && (
                        <span className="text-[10px] text-gray-400">pending</span>
                      )}
                    </div>
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

        {editingSlip && (
          <PayslipEditModal
            slip={editingSlip}
            saving={savingSlip}
            onSave={saveSlipEdit}
            onClose={() => !savingSlip && setEditingSlip(null)}
          />
        )}

        {advanceSlip && (
          <AdvanceSettlementModal
            slip={advanceSlip.slip}
            advance={advanceSlip.advance}
            saving={savingAdvance}
            onSave={saveAdvance}
            onClose={() => !savingAdvance && setAdvanceSlip(null)}
          />
        )}

        {payslipDoc && (
          <PayslipDocumentModal
            doc={payslipDoc}
            run={activeRun}
            onClose={() => setPayslipDoc(null)}
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
        <p className="text-xs text-gray-500">
          Generate monthly salaries for all active staff. Salary comes from each staff member's active contract.
          An outstanding advance nets off this month's pay — by default as much as the salary can cover, but the
          <strong className="text-amber-700"> Advance</strong> box on each row lets you recover less and hand over the
          difference in cash. Whatever isn't recovered stays on the staff member's ledger for next month.
        </p>
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
                <th className="text-right px-3 py-2">Leave/Absence</th>
                <th className="text-right px-3 py-2">Advance</th>
                <th className="text-left px-3 py-2">Manual deduction</th>
                <th className="text-right px-3 py-2">Net pay</th>
                <th className="text-center px-3 py-2">Status / Skip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {preview.rows.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-xs text-gray-400 italic">No active staff for this period.</td></tr>
              ) : preview.rows.map((r) => {
                const st = ROW_STATE[r.status] || ROW_STATE.ready;
                const e = edits[r.staff_id] || {};
                const man = (e.manual?.[0]?.amount) || 0;
                const leave = r.status === "ready" ? Number(r.leave_deduction || 0) : 0;
                const advMax = advanceMaxOf(r);
                const adv = r.status === "ready" ? advanceFor(r, e) : 0;
                const advOutstanding = Number(r.advance_outstanding || 0);
                const advLeft = Math.max(0, advOutstanding - adv);
                const net = r.status === "ready"
                  ? Number(r.gross_salary) + Number(r.allowances_total) - Number(man) - leave - adv
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
                    <td className="px-3 py-2 text-right font-mono text-red-600"
                        title={r.leave_breakdown?.reason || ""}>
                      {r.status === "ready" && leave > 0 ? `−${fmt(leave)}` : "—"}
                      {/* Annual allowance is the reason most months show nothing:
                          approved leave inside it is fully paid. */}
                      {r.status === "ready" && r.leave_breakdown?.annual_leave_days > 0 && (
                        <span className="block text-[9px] text-gray-400 font-sans">
                          {r.leave_breakdown.paid_leave_days > 0
                            ? `${r.leave_breakdown.paid_leave_days}d paid leave`
                            : `${r.leave_breakdown.entitlement_remaining}/${r.leave_breakdown.annual_leave_days}d left`}
                        </span>
                      )}
                    </td>
                    {/* Advance recovery is a decision, not a formula — the box
                        is editable so the admin can pay part of the salary in
                        cash and roll the rest of the debt forward. Blank = the
                        automatic maximum. */}
                    <td className="px-3 py-2 text-right"
                        title={advOutstanding > 0
                          ? `Advance outstanding ${fmt(advOutstanding)} — recovering ${fmt(adv)} this month${advLeft > 0 ? `, ${fmt(advLeft)} carried to next month` : ""}`
                          : "No outstanding advance"}>
                      {r.status === "ready" && advMax > 0 && !skipped ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <div className="flex items-center gap-1">
                            <span className="text-amber-700 font-mono">−</span>
                            <input
                              type="number" min="0" max={advMax} step="0.01"
                              value={e.advance ?? adv}
                              onChange={(ev) => setAdvance(r.staff_id, ev.target.value)}
                              className="w-20 px-1.5 py-1 text-[10px] text-right font-mono border border-amber-200 bg-amber-50/40 rounded focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div className="flex items-center gap-1 text-[9px]">
                            <button type="button" onClick={() => setAdvance(r.staff_id, advMax)}
                              className={`px-1 rounded ${adv === advMax ? "bg-amber-100 text-amber-800 font-semibold" : "text-gray-400 hover:text-amber-700"}`}>
                              all
                            </button>
                            <button type="button" onClick={() => setAdvance(r.staff_id, Math.round(advMax / 2 * 100) / 100)}
                              className="px-1 rounded text-gray-400 hover:text-amber-700">half</button>
                            <button type="button" onClick={() => setAdvance(r.staff_id, 0)}
                              className={`px-1 rounded ${adv === 0 ? "bg-teal-100 text-teal-800 font-semibold" : "text-gray-400 hover:text-teal-700"}`}>
                              none
                            </button>
                          </div>
                          {/* Take-home first: it is the number the staff member
                              actually feels, and the one that must never hit 0
                              by accident. */}
                          <span className={`text-[9px] ${net <= 0 ? "text-red-600 font-semibold" : "text-gray-400"}`}>
                            {net <= 0 ? "takes home nothing" : `takes home ${fmt(net)}`}
                            {advLeft > 0 ? ` · ${fmt(advLeft)} left` : " · clears it"}
                          </span>
                        </div>
                      ) : <span className="font-mono text-gray-300">—</span>}
                    </td>
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
                  <td className="px-3 py-2 text-right font-mono text-red-600">{totals.dleave > 0 ? `−${fmt(totals.dleave)}` : "—"}</td>
                  <td className="px-3 py-2 text-right font-mono text-amber-700">{totals.dadv > 0 ? `−${fmt(totals.dadv)}` : "—"}</td>
                  <td className="px-3 py-2 text-right font-mono text-amber-700">{totals.dman > 0 ? `−${fmt(totals.dman)}` : "—"}</td>
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
                {/* Edit + Delete sit on the row itself, the same way the party
                    ledger exposes them — a run's figures are edited per payslip,
                    so Edit opens the run and puts you on those rows. */}
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1.5">
                    {canEdit && (
                      // stopPropagation on each: the whole row opens the run.
                      <button
                        onClick={(ev) => { ev.stopPropagation(); openRun(r.id); }}
                        title="Edit this run's payslips"
                        className="px-2 py-1 text-[10px] font-semibold text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-50">
                        Edit
                      </button>
                    )}
                    {canDeleteRun(r, r.paid_payslips_count) && (
                      <button
                        onClick={(ev) => { ev.stopPropagation(); removeRun(r, { paid: r.paid_payslips_count }); }}
                        disabled={busyRunId === r.id}
                        title="Delete this payroll run"
                        className="px-2 py-1 text-[10px] font-semibold text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-40">
                        {busyRunId === r.id ? "…" : "Delete"}
                      </button>
                    )}
                    <span className="text-[10px] text-teal-600">Open →</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <BudgetWarningModal
        breach={budgetBreach}
        title="Salaries budget would be exceeded"
        canOverride={canOverrideBudget}
        busy={overridingBudget}
        onClose={() => setBudgetBreach(null)}
        onConfirm={handleBudgetOverride}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────── Payslip edit modal
// Corrects a still-pending payslip. Gross and allowances are shown because a
// contract can be recorded wrong; the deduction rows are the usual reason to
// come here. Automatic leave/absence lines are listed read-only — they come
// from attendance, so they are preserved untouched by the save.
//
// Net is recomputed live with the same arithmetic the server uses:
//   net = gross + allowances − deductions − advance already recovered
function PayslipEditModal({ slip, saving, onSave, onClose }) {
  const autoLines = (slip.manual_deductions || []).filter((d) => d.auto);
  const [gross, setGross] = useState(String(slip.gross_salary ?? ""));
  const [allowances, setAllowances] = useState(String(slip.allowances_total ?? ""));
  const [rows, setRows] = useState(() => {
    const manual = (slip.manual_deductions || []).filter((d) => !d.auto);
    return manual.length ? manual.map((d) => ({ label: d.label, amount: String(d.amount) }))
                         : [{ label: "", amount: "" }];
  });
  const [notes, setNotes] = useState(slip.notes || "");

  const name = slip.staff?.full_name || slip.staff?.employee_id || `Staff #${slip.staff_id}`;
  const advance = Number(slip.advance_offset) || 0;
  const autoTotal = autoLines.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const manualTotal = rows.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const earnings = (Number(gross) || 0) + (Number(allowances) || 0);
  const net = earnings - autoTotal - manualTotal - advance;

  const setRow = (i, patch) => setRows((a) => a.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((a) => [...a, { label: "", amount: "" }]);
  const dropRow = (i) => setRows((a) => (a.length === 1 ? [{ label: "", amount: "" }] : a.filter((_, idx) => idx !== i)));

  const submit = (ev) => {
    ev.preventDefault();
    onSave({
      gross_salary: Number(gross) || 0,
      allowances_total: Number(allowances) || 0,
      manual_deductions: rows
        .filter((r) => (Number(r.amount) || 0) > 0)
        .map((r) => ({ label: r.label.trim() || "Deduction", amount: Number(r.amount) })),
      notes: notes.trim() || null,
    });
  };

  const inputCls = "w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500";

  // Portalled to <body> rather than left inside the run-detail tree. A
  // `position: fixed` overlay is only viewport-relative while no ancestor
  // establishes a containing block (a transform / filter / backdrop-filter on
  // any wrapper silently re-anchors it), and this page nests the modal several
  // layers deep. PayrollReceiptModal below portals for the same reason.
  return createPortal(
    <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(ev) => { if (ev.target === ev.currentTarget) onClose(); }}>
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-indigo-50/50">
          <h3 className="text-sm font-bold text-indigo-800">Edit payslip #{slip.id}</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {name} · the accrual journal entry is re-stated with your changes.
          </p>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Gross salary</label>
              <input type="number" min="0" step="0.01" value={gross} onChange={(e) => setGross(e.target.value)}
                className={`${inputCls} text-right font-mono`} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Allowances</label>
              <input type="number" min="0" step="0.01" value={allowances} onChange={(e) => setAllowances(e.target.value)}
                className={`${inputCls} text-right font-mono`} />
            </div>
          </div>
          <p className="text-[10px] text-gray-400 -mt-2">
            Changing these affects this payslip only — the staff contract is left as it is.
          </p>

          {autoLines.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <p className="px-3 py-1.5 bg-gray-50 text-[10px] font-semibold text-gray-500 uppercase">
                Automatic deductions · from attendance, not editable
              </p>
              {autoLines.map((d, i) => (
                <div key={i} className="flex justify-between px-3 py-1.5 text-[11px] text-gray-600 border-t border-gray-50">
                  <span>{d.label}</span>
                  <span className="font-mono text-red-600">−{fmt(d.amount)}</span>
                </div>
              ))}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-semibold text-gray-500 uppercase">Manual deductions</label>
              <button type="button" onClick={addRow}
                className="px-2 py-0.5 text-[10px] font-semibold text-teal-600 border border-gray-200 rounded hover:bg-teal-50">
                + Add
              </button>
            </div>
            <div className="space-y-1.5">
              {rows.map((r, i) => (
                <div key={i} className="flex gap-1.5">
                  <input placeholder="Reason" value={r.label} onChange={(e) => setRow(i, { label: e.target.value })}
                    maxLength={120} className={`${inputCls} flex-1`} />
                  <input type="number" min="0" step="0.01" placeholder="0" value={r.amount}
                    onChange={(e) => setRow(i, { amount: e.target.value })}
                    className={`${inputCls} w-24 text-right font-mono`} />
                  <button type="button" onClick={() => dropRow(i)}
                    className="w-7 flex-shrink-0 text-gray-300 hover:text-red-600 text-sm">×</button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Note (optional)</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500}
              placeholder="Why this payslip was corrected" className={inputCls} />
          </div>

          {/* Live recomputation — matches the server's arithmetic exactly. */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-[11px] space-y-1">
            <Row label="Earnings" v={earnings} />
            {autoTotal > 0 && <Row label="Automatic deductions" v={-autoTotal} />}
            {manualTotal > 0 && <Row label="Manual deductions" v={-manualTotal} />}
            {advance > 0 && <Row label="Advance recovered (fixed)" v={-advance} />}
            <div className="flex justify-between pt-1.5 border-t border-gray-200 font-bold text-teal-700">
              <span>Net pay</span>
              <span className="font-mono">{fmt(net)} AFN</span>
            </div>
            {net < 0 && (
              <p className="text-[10px] text-red-600 pt-1">
                Deductions exceed this payslip — net can't go below zero.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
          <button type="button" onClick={onClose} disabled={saving}
            className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={saving || net < 0}
            className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

// ──────────────────────────────────────────────── Advance settlement modal
// Splits one month's pay between cash-in-hand and advance repayment.
//
// The rule the school runs on: an advance bigger than a single salary is
// settled over as many months as it takes, and each month somebody decides how
// much comes off. Both sliders of that decision are the same number seen from
// opposite ends, so the modal edits either and keeps them in sync:
//
//     take-home  +  recovered  =  payable   (earnings − deductions)
//
// Recover 0 and the staff member is paid in full this month with the debt
// untouched; recover the cap and they take nothing home while the debt drops by
// a whole salary. The server clamps to exactly the same [0, cap] window.
function AdvanceSettlementModal({ slip, advance, saving, onSave, onClose }) {
  const name = slip.staff?.full_name || slip.staff?.employee_id || `Staff #${slip.staff_id}`;
  const earnings = Number(slip.gross_salary || 0) + Number(slip.allowances_total || 0);
  const deductions = Number(slip.manual_deductions_total || 0);
  const payable = Math.max(0, round2(earnings - deductions));
  const current = Number(slip.advance_offset || 0);
  // What was outstanding BEFORE this payslip recovered anything.
  const outstanding = Number(advance?.before ?? current);
  const cap = round2(Math.min(outstanding, payable));

  const [recover, setRecover] = useState(String(current));
  const value = Math.min(Math.max(0, Number(recover) || 0), cap);
  const takeHome = round2(payable - value);
  const leftAfter = round2(outstanding - value);
  const overCap = (Number(recover) || 0) > cap;

  const inputCls = "w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500";

  return createPortal(
    <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(ev) => { if (ev.target === ev.currentTarget) onClose(); }}>
      <form
        onSubmit={(ev) => { ev.preventDefault(); onSave(value); }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-amber-50/60">
          <h3 className="text-sm font-bold text-amber-900">Advance settlement</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {name} · payslip #{slip.id} · decide how much of the advance comes off this month.
          </p>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          {/* Position before anything is decided */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2">
              <p className="text-[9px] uppercase tracking-wider text-amber-700">Advance outstanding</p>
              <p className="text-base font-bold font-mono text-amber-900">{fmt(outstanding)}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <p className="text-[9px] uppercase tracking-wider text-gray-500">Payable this month</p>
              <p className="text-base font-bold font-mono text-gray-800">{fmt(payable)}</p>
            </div>
          </div>

          {cap === 0 ? (
            <p className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
              {outstanding <= 0
                ? "This staff member has no outstanding advance — there is nothing to recover."
                : "There is nothing payable this month, so no advance can be recovered from it."}
            </p>
          ) : (
            <>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">
                  Recover from this salary
                  <span className="text-gray-400 normal-case font-normal ml-1">— max {fmt(cap)}</span>
                </label>
                <input type="number" min="0" max={cap} step="0.01" value={recover}
                  onChange={(ev) => setRecover(ev.target.value)}
                  className={`${inputCls} text-right font-mono`} />
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Preset label={`Recover all (${fmt(cap)})`} onClick={() => setRecover(String(cap))} active={value === cap} tone="amber" />
                  <Preset label="Half" onClick={() => setRecover(String(round2(cap / 2)))} />
                  <Preset label="Pay salary in full" onClick={() => setRecover("0")} active={value === 0} tone="teal" />
                </div>
                {overCap && (
                  <p className="text-[10px] text-amber-700 mt-1">
                    Capped at {fmt(cap)} — you can't recover more than is owed, or more than this month pays.
                  </p>
                )}
              </div>

              {/* The same decision, stated as cash the staff member walks away with. */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-[11px] space-y-1">
                <Row label="Payable this month" v={payable} />
                <Row label="Recovered against advance" v={-value} />
                <div className="flex justify-between pt-1.5 border-t border-gray-200 font-bold text-teal-700">
                  <span>Staff takes home</span>
                  <span className="font-mono">{fmt(takeHome)} AFN</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-gray-200 text-amber-800">
                  <span>Advance still owed after this</span>
                  <span className="font-mono font-semibold">{fmt(leftAfter)} AFN</span>
                </div>
                {leftAfter > 0 && (
                  <p className="text-[10px] text-gray-500 pt-1">
                    Carries to next month's payroll, where the same choice is offered again.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
          <button type="button" onClick={onClose} disabled={saving}
            className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={saving || cap === 0}
            className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? "Saving…" : `Recover ${fmt(value)} · pay ${fmt(takeHome)}`}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

function Preset({ label, onClick, active, tone }) {
  const activeCls = tone === "teal" ? "bg-teal-100 text-teal-800 border-teal-300"
                  : tone === "amber" ? "bg-amber-100 text-amber-800 border-amber-300"
                  : "bg-gray-200 text-gray-800 border-gray-300";
  return (
    <button type="button" onClick={onClick}
      className={`px-2 py-1 text-[10px] font-semibold rounded border transition-colors ${
        active ? activeCls : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
      }`}>
      {label}
    </button>
  );
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function Row({ label, v }) {
  const neg = Number(v) < 0;
  return (
    <div className="flex justify-between text-gray-600">
      <span>{label}</span>
      <span className={`font-mono ${neg ? "text-amber-700" : ""}`}>
        {neg ? "−" : ""}{fmt(Math.abs(Number(v) || 0))}
      </span>
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
  // At least one account that can actually cover the payment.
  const anyFunded = accounts.some((a) => Number(a.current_balance) >= total);

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
                  // Not selectable when it can't cover the payment. The server
                  // refuses it too; blocking here saves the round-trip.
                  disabled={insufficient}
                  title={insufficient ? "This account does not hold enough to cover the payment" : undefined}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${
                    insufficient
                      ? "bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed"
                      : sel
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
                    <p className={`text-xs font-mono font-semibold ${insufficient ? "text-red-600" : "text-gray-700"}`}>
                      {fmt(a.current_balance)} AFN
                    </p>
                    {insufficient && (
                      <p className="text-[9px] text-red-600 mt-0.5 font-semibold">
                        {Number(a.current_balance) <= 0
                          ? "empty"
                          : `${fmt(total - Number(a.current_balance))} short`}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Nothing in any payroll account can cover this — say so plainly
              rather than leaving an all-greyed list with no explanation. */}
          {!anyFunded && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
              <p className="text-[11px] text-red-700 leading-relaxed">
                No payroll account holds the {fmt(total)} AFN this payment needs, so it cannot be
                made. Deposit or transfer money in under <strong>Finance → Accounts</strong> first.
              </p>
            </div>
          )}
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

  // Portal the entire modal to <body> so it's NOT nested inside #root.
  // That lets the print CSS `display: none` everything under #root without
  // killing the receipt, and the printer never sees the underlying page
  // layout (which was generating 4–5 phantom pages with visibility:hidden).
  return createPortal(
    <div
      className="payroll-print-host fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:bg-white print:p-0 print:static print:block"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Print-only CSS:
            1) Hide the entire React app root (#root) so its layout is gone.
            2) Reset the modal overlay from `position: fixed; full-screen` to
               normal flow so the printer treats the receipt as the whole page.
            3) Strip the rounded card chrome (max-height, shadow, border-radius)
               so the receipt isn't a tiny box on a giant page. */}
      <style>{`
        @media print {
          @page { size: A5 portrait; margin: 8mm; }
          body { background: white !important; }
          body > #root { display: none !important; }
          .payroll-print-host {
            position: static !important;
            padding: 0 !important;
            background: white !important;
            backdrop-filter: none !important;
          }
          .payroll-print-host > div {
            max-height: none !important;
            max-width: none !important;
            width: 100% !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
          }
          #payroll-receipt {
            padding: 0 !important;
            overflow: visible !important;
          }
          .print\\:hidden { display: none !important; }
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
    </div>,
    document.body
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
        {/* Advance recovery is why net can be far below gross — leaving it off
            the receipt made the handed-over amount look wrong. */}
        <Line label="Advance recovery"    value={-Number(slip.advance_offset || 0)} muted={!Number(slip.advance_offset)} />
        <div className="border-t border-gray-300 mt-2 pt-2 flex items-center justify-between font-bold">
          <span>Cash paid</span>
          <span>{fmt(slip.net_pay)} AFN</span>
        </div>
      </div>

      {/* Advance statement. The staff member signs for the cash, so the receipt
          has to answer the question they will actually ask: how much of my
          advance is left now? Printed only when there is an advance at all. */}
      <AdvanceStatement slip={slip} />
    </>
  );
}

/**
 * Opening / repaid / closing on the staff member's advance, as at this payslip.
 *
 * `party.balance` is read AFTER the run recovered against it, so the opening
 * figure is reconstructed by adding this payslip's recovery back on.
 */
function AdvanceStatement({ slip }) {
  const repaid = Number(slip.advance_offset || 0);
  const after = Number(slip.party?.balance ?? 0);
  const before = after + repaid;
  if (before <= 0) return null;

  return (
    <div className="mt-4 border border-gray-300 rounded p-3 text-[11px]">
      <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 font-bold">
        Advance account
      </p>
      <div className="space-y-1">
        <Line label="Advance before this salary" value={before} />
        <Line label="Repaid from this salary"    value={-repaid} muted={!repaid} />
        <div className="border-t border-gray-300 mt-1.5 pt-1.5 flex items-center justify-between font-bold">
          <span>Advance still owed</span>
          <span>{fmt(after)} AFN</span>
        </div>
      </div>
      {after > 0 && (
        <p className="text-[9px] text-gray-500 mt-2">
          Carried forward — it comes off future salaries until it is cleared.
        </p>
      )}
    </div>
  );
}

function BulkPayslipsBody({ payslips }) {
  // Anyone carrying an advance needs their own two columns on the bill —
  // otherwise "Cash" alone looks like the wrong salary was paid.
  const anyAdvance = payslips.some(
    (p) => Number(p.advance_offset) > 0 || Number(p.party?.balance) > 0
  );
  const totalRepaid = payslips.reduce((s, p) => s + Number(p.advance_offset || 0), 0);

  return (
    <>
      <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Payees ({payslips.length})</p>
      <table className="w-full text-[11px] border-t border-b border-gray-200">
        <thead>
          <tr className="text-left text-[9px] uppercase tracking-wider text-gray-500 border-b border-gray-100">
            <th className="py-1.5">Staff</th>
            {anyAdvance && <th className="py-1.5 text-right">To advance</th>}
            {anyAdvance && <th className="py-1.5 text-right">Still owed</th>}
            <th className="py-1.5 text-right">Cash</th>
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
              {anyAdvance && (
                <td className="py-1.5 text-right">
                  {Number(p.advance_offset) > 0 ? `−${fmt(p.advance_offset)}` : "—"}
                </td>
              )}
              {anyAdvance && (
                <td className="py-1.5 text-right text-gray-500">
                  {Number(p.party?.balance) > 0 ? fmt(p.party.balance) : "—"}
                </td>
              )}
              <td className="py-1.5 text-right font-semibold">{fmt(p.net_pay)}</td>
            </tr>
          ))}
        </tbody>
        {anyAdvance && totalRepaid > 0 && (
          <tfoot>
            <tr className="border-t border-gray-200 font-semibold">
              <td className="py-1.5">Recovered against advances</td>
              <td className="py-1.5 text-right">−{fmt(totalRepaid)}</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        )}
      </table>
    </>
  );
}

// ───────────────────────────────────────────────── A5 payslip document
// The staff member's copy: what they earned, everything taken off it, what they
// were handed, and where their advance now stands. Laid out as a payslip rather
// than a receipt — earnings and deductions in two columns, then net pay, then
// the advance position (opening / recovered / closing) so the month-to-month
// settlement is auditable from the paper alone.
//
// Print CSS mirrors PayrollReceiptModal: #root is hidden, the portalled host is
// taken out of fixed positioning, and the page is set to A5 portrait.
function PayslipDocumentModal({ doc, run, onClose }) {
  const slip = doc.payslip;
  const adv = doc.advance || { before: 0, recovered: 0, after: 0 };
  const staff = slip.staff || {};
  const period = run
    ? `${MONTHS[run.period_month - 1]} ${run.period_year}`
    : `${MONTHS[(slip.period_month || 1) - 1]} ${slip.period_year || ""}`;

  const allowanceLines = Array.isArray(slip.allowances) ? slip.allowances : [];
  const deductionLines = Array.isArray(slip.manual_deductions) ? slip.manual_deductions : [];
  const earnings = Number(slip.gross_salary || 0) + Number(slip.allowances_total || 0);
  const deductions = Number(slip.manual_deductions_total || 0) + Number(slip.advance_offset || 0);
  const branchName = slip.payroll_run?.branch?.name || staff.branch?.name || "";

  return createPortal(
    <div
      className="payroll-print-host fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:bg-white print:p-0 print:static print:block"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{`
        @media print {
          @page { size: A5 portrait; margin: 8mm; }
          body { background: white !important; }
          body > #root { display: none !important; }
          .payroll-print-host {
            position: static !important;
            padding: 0 !important;
            background: white !important;
            backdrop-filter: none !important;
          }
          .payroll-print-host > div {
            max-height: none !important;
            max-width: none !important;
            width: 100% !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
          }
          #payslip-doc { padding: 0 !important; overflow: visible !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50 print:hidden">
          <h3 className="text-sm font-bold text-gray-800">Payslip · {period}</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print A5
            </button>
            <button onClick={onClose}
              className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50">
              Close
            </button>
          </div>
        </div>

        <div id="payslip-doc" className="p-6 overflow-y-auto bg-white text-gray-800"
          style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
          <div className="text-center border-b-2 border-gray-300 border-double pb-3 mb-3">
            <h2 className="text-base font-bold tracking-wide">WIFAQ SCHOOL</h2>
            <p className="text-[10px] text-gray-500">SALARY PAYSLIP</p>
            {branchName && <p className="text-[9px] text-gray-400">{branchName}</p>}
          </div>

          {/* Identity + period */}
          <div className="grid grid-cols-2 gap-y-1 text-[11px] mb-3">
            <span className="text-gray-500">Payslip #</span>
            <span className="text-right font-semibold">PS-{slip.id}</span>
            <span className="text-gray-500">Employee</span>
            <span className="text-right font-semibold">{staff.full_name || staff.employee_id || `Staff #${slip.staff_id}`}</span>
            {staff.employee_id && (<>
              <span className="text-gray-500">Employee ID</span>
              <span className="text-right">{staff.employee_id}</span>
            </>)}
            {staff.department && (<>
              <span className="text-gray-500">Department</span>
              <span className="text-right">{staff.department}</span>
            </>)}
            <span className="text-gray-500">Pay period</span>
            <span className="text-right font-semibold">{period}</span>
            <span className="text-gray-500">Status</span>
            <span className="text-right capitalize">
              {slip.status}{slip.paid_at ? ` · ${String(slip.paid_at).slice(0, 10)}` : ""}
            </span>
            {slip.paid_from_account?.account_name && (<>
              <span className="text-gray-500">Paid from</span>
              <span className="text-right">{slip.paid_from_account.account_name}</span>
            </>)}
          </div>

          {/* Earnings */}
          <p className="text-[9px] uppercase tracking-wider text-gray-400 border-b border-gray-200 pb-1 mb-1.5">Earnings</p>
          <div className="text-[11px] space-y-1 mb-3">
            <Line label="Basic salary" value={slip.gross_salary} />
            {allowanceLines.length > 0
              ? allowanceLines.map((a, i) => <Line key={i} label={a.label || "Allowance"} value={a.amount} />)
              : Number(slip.allowances_total) > 0 && <Line label="Allowances" value={slip.allowances_total} />}
            <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold">
              <span>Total earnings</span><span>{fmt(earnings)}</span>
            </div>
          </div>

          {/* Deductions — including the advance recovery, which is the whole
              point of the document for anyone repaying one. */}
          <p className="text-[9px] uppercase tracking-wider text-gray-400 border-b border-gray-200 pb-1 mb-1.5">Deductions</p>
          <div className="text-[11px] space-y-1 mb-3">
            {deductionLines.length === 0 && Number(slip.advance_offset) <= 0 && (
              <p className="text-gray-400 italic">None</p>
            )}
            {deductionLines.map((d, i) => (
              <Line key={i} label={d.label || "Deduction"} value={-Number(d.amount || 0)} />
            ))}
            {Number(slip.advance_offset) > 0 && (
              <Line label="Advance recovery" value={-Number(slip.advance_offset)} />
            )}
            {deductions > 0 && (
              <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold">
                <span>Total deductions</span>
                <span className="text-amber-700">−{fmt(deductions)}</span>
              </div>
            )}
          </div>

          {/* Net */}
          <div className="border-t-2 border-b-2 border-gray-300 border-double py-2 flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Net pay</span>
            <span className="text-lg font-bold">{fmt(slip.net_pay)} AFN</span>
          </div>
          {Number(slip.net_pay) === 0 && Number(slip.advance_offset) > 0 && (
            <p className="text-[10px] text-amber-800 mb-3">
              Nothing was disbursed this month — the whole salary went to clearing the advance below.
            </p>
          )}

          {/* Advance ledger position — opening / recovered / closing */}
          {(adv.before > 0 || adv.recovered > 0) && (
            <>
              <p className="text-[9px] uppercase tracking-wider text-gray-400 border-b border-gray-200 pb-1 mb-1.5">
                Advance account
              </p>
              <div className="text-[11px] space-y-1 mb-3">
                <Line label="Owed before this salary" value={adv.before} />
                <Line label="Recovered this month" value={-Number(adv.recovered || 0)} />
                <div className="flex justify-between border-t border-gray-200 pt-1 font-bold">
                  <span>Still owed</span>
                  <span className={Number(adv.after) > 0 ? "text-amber-700" : "text-emerald-700"}>
                    {fmt(adv.after)} AFN
                  </span>
                </div>
                <p className="text-[9px] text-gray-400">
                  {Number(adv.after) > 0
                    ? "Carried forward — recovered from future salaries."
                    : "Advance fully settled."}
                </p>
              </div>
            </>
          )}

          {slip.notes && (
            <p className="text-[10px] text-gray-500 border-t border-gray-200 pt-2 mb-3">{slip.notes}</p>
          )}

          <div className="mt-6 grid grid-cols-2 gap-6 text-[10px] text-gray-500">
            <div><div className="border-t border-gray-400 pt-1">Prepared by</div></div>
            <div><div className="border-t border-gray-400 pt-1 text-right">Employee signature</div></div>
          </div>

          <p className="text-[9px] text-gray-400 text-center mt-5">
            System-generated payslip. Check the figures above before signing.
          </p>
        </div>
      </div>
    </div>,
    document.body
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
