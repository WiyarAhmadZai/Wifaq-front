import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  getPartyLedger,
  getAccounts,
  getChartOfAccounts,
  givePartyAdvance,
  recordPartyExpense,
  recordPartyRepayment,
  recordPartyReimbursement,
} from "../../api/financial";

/**
 * Party ledger — staff advance bookkeeping with four canonical actions:
 *   • Give Advance      → school deposits money with party
 *   • Record Expense    → party spent the advance on something
 *   • Record Repayment  → party returns unspent advance
 *   • Reimburse         → school pays party back when balance is negative
 *
 * Each action posts a balanced journal entry + creates one ledger row.
 * Running balance = opening_balance + Σ debits − Σ credits.
 *
 *   balance > 0 → party owes school
 *   balance < 0 → school owes party
 */

const ENTRY_META = {
  advance:       { label: "Advance",       tone: "bg-blue-50 text-blue-700 border-blue-200",       icon: "↑" },
  expense:       { label: "Expense",       tone: "bg-red-50 text-red-700 border-red-200",          icon: "↓" },
  repayment:     { label: "Repayment",     tone: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "↗" },
  reimbursement: { label: "Reimbursement", tone: "bg-amber-50 text-amber-700 border-amber-200",    icon: "⇩" },
  adjustment:    { label: "Adjustment",    tone: "bg-gray-100 text-gray-700 border-gray-300",      icon: "⚙" },
};

const fmtMoney = (n) => Number(n || 0).toLocaleString();
const fmtDateLong = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const todayIso = () => new Date().toISOString().slice(0, 10);

export default function PartyLedger() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState([]);
  const [savingAction, setSavingAction] = useState(null); // 'advance' | 'expense' | etc.

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getPartyLedger(id);
      setData(r.data?.data || null);
    } catch (e) {
      console.error(e);
      Swal.fire("Failed to load", e.response?.data?.message || "Could not load ledger.", "error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    getAccounts({ per_page: 100 })
      .then((r) => setCashAccounts(r.data?.data?.data || r.data?.data || []))
      .catch(() => setCashAccounts([]));
    getChartOfAccounts({ per_page: 500 })
      .then((r) => {
        const all = r.data?.data?.data || r.data?.data || [];
        // Expense accounts in the standard chart start with code 5xxx.
        setExpenseAccounts(all.filter((a) => String(a.code || "").startsWith("5")));
      })
      .catch(() => setExpenseAccounts([]));
  }, [load]);

  // ────────────────────────────────────────────────── Action handlers

  const promptAndDispatch = async ({ title, mutationFn, requiresAccount = true, requiresExpenseAccount = false, helpText }) => {
    const accountOptions = (cashAccounts || [])
      .map((a) => `<option value="${a.id}">${a.account_name}${a.account_type ? ` (${a.account_type})` : ""}</option>`)
      .join("");
    const expenseOptions = (expenseAccounts || [])
      .map((a) => `<option value="${a.id}">${a.code} — ${a.name}</option>`)
      .join("");

    const { value, isConfirmed } = await Swal.fire({
      title,
      html: `
        <div style="text-align:left;font-size:11px;color:#475569;margin-bottom:8px">${helpText}</div>
        <input id="pl-amount" type="number" class="swal2-input" placeholder="Amount (AFN)" min="0.01" step="0.01" />
        ${requiresAccount ? `<select id="pl-account" class="swal2-input"><option value="">— Cash / bank account —</option>${accountOptions}</select>` : ""}
        ${requiresExpenseAccount ? `<select id="pl-expense" class="swal2-input"><option value="">— Expense account —</option>${expenseOptions}</select>` : ""}
        <input id="pl-date" type="date" class="swal2-input" value="${todayIso()}" />
        <input id="pl-note" type="text" class="swal2-input" placeholder="Note (optional)" />
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: "#0d9488",
      preConfirm: () => {
        const amount = Number(document.getElementById("pl-amount").value);
        if (!amount || amount <= 0) { Swal.showValidationMessage("Amount must be greater than 0"); return false; }
        const date = document.getElementById("pl-date").value;
        const note = document.getElementById("pl-note").value || null;
        const out = { amount, date, note };
        if (requiresAccount) {
          const accId = Number(document.getElementById("pl-account").value);
          if (!accId) { Swal.showValidationMessage("Pick a cash/bank account"); return false; }
          out.account_id = accId;
        }
        if (requiresExpenseAccount) {
          const exId = Number(document.getElementById("pl-expense").value);
          if (!exId) { Swal.showValidationMessage("Pick an expense category"); return false; }
          out.expense_chart_account_id = exId;
        }
        return out;
      },
    });
    if (!isConfirmed || !value) return;

    setSavingAction(title);
    try {
      await mutationFn(id, value);
      await load();
      Swal.fire("Recorded", "Posted to the journal and the party ledger.", "success");
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Could not record entry.", "error");
    } finally {
      setSavingAction(null);
    }
  };

  const handleAdvance = () => promptAndDispatch({
    title: "Give Advance",
    helpText: "Deposit money with this party. <strong>Balance goes UP</strong> — they will owe the school this amount.",
    mutationFn: givePartyAdvance,
    requiresAccount: true,
  });

  const handleExpense = () => promptAndDispatch({
    title: "Record Expense",
    helpText: "Party spent the advance on something for the school. <strong>Balance goes DOWN.</strong> Choose the expense category the money went toward.",
    mutationFn: recordPartyExpense,
    requiresAccount: false,
    requiresExpenseAccount: true,
  });

  const handleRepayment = () => promptAndDispatch({
    title: "Record Repayment",
    helpText: "Party returns unspent advance to the school. <strong>Balance goes DOWN.</strong>",
    mutationFn: recordPartyRepayment,
    requiresAccount: true,
  });

  const handleReimbursement = () => promptAndDispatch({
    title: "Reimburse Party",
    helpText: "Party over-spent (or paid out of their own pocket); the school pays them back. Use when balance is <strong>negative</strong>.",
    mutationFn: recordPartyReimbursement,
    requiresAccount: true,
  });

  // ────────────────────────────────────────────────── Derived display state

  const party = data?.party;
  const summary = data?.summary;
  const ledger = data?.ledger || [];

  const runningBalances = useMemo(() => {
    if (!summary) return [];
    let bal = Number(summary.opening_balance || 0);
    return ledger.map((e) => {
      bal += e.direction === "debit" ? Number(e.amount) : -Number(e.amount);
      return Number(bal.toFixed(2));
    });
  }, [ledger, summary]);

  const balance = Number(summary?.closing_balance ?? 0);
  const balanceTone = balance > 0
    ? { label: "owes school", className: "text-red-700" }
    : balance < 0
      ? { label: "school owes party", className: "text-amber-700" }
      : { label: "settled", className: "text-emerald-700" };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
      </div>
    );
  }
  if (!party) {
    return (
      <div className="px-4 py-12 text-center text-sm text-gray-500">
        Party not found.
        <div className="mt-3">
          <button onClick={() => navigate("/finance/parties")} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs">
            Back to Parties
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate("/finance/parties")}
              className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">{party.full_name}</h1>
              <p className="text-xs text-gray-500">
                <span className="font-mono">{party.party_code}</span>
                {" · "}
                <span className="capitalize">{party.party_type}</span>
                {party.phone ? ` · ${party.phone}` : ""}
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-gray-500 uppercase font-semibold">Current balance</p>
            <p className={`text-2xl font-bold ${balanceTone.className}`}>
              {balance >= 0 ? "" : "−"}{fmtMoney(Math.abs(balance))} <span className="text-xs">AFN</span>
            </p>
            <p className={`text-[10px] mt-0.5 uppercase tracking-wider font-semibold ${balanceTone.className}`}>
              {balanceTone.label}
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <ActionButton
          label="Give Advance"
          subtitle="Deposit money"
          tone="blue"
          onClick={handleAdvance}
          disabled={!!savingAction}
        />
        <ActionButton
          label="Record Expense"
          subtitle="Party spent the money"
          tone="red"
          onClick={handleExpense}
          disabled={!!savingAction}
        />
        <ActionButton
          label="Record Repayment"
          subtitle="Party returned cash"
          tone="emerald"
          onClick={handleRepayment}
          disabled={!!savingAction || balance <= 0}
          disabledHint={balance <= 0 ? "Nothing owed by party" : null}
        />
        <ActionButton
          label="Reimburse"
          subtitle="School pays party"
          tone="amber"
          onClick={handleReimbursement}
          disabled={!!savingAction || balance >= 0}
          disabledHint={balance >= 0 ? "Only when school owes" : null}
        />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Opening" value={fmtMoney(summary?.opening_balance)} tone="text-gray-800" />
        <Stat label="Total debits" value={fmtMoney(summary?.total_debit)} tone="text-blue-700" subtle="bg-blue-50/40 ring-blue-100" />
        <Stat label="Total credits" value={fmtMoney(summary?.total_credit)} tone="text-emerald-700" subtle="bg-emerald-50/40 ring-emerald-100" />
        <Stat label="Transactions" value={String(summary?.transaction_count || 0)} tone="text-gray-800" />
      </div>

      {/* Ledger table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Transaction history</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/60">
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Description</th>
                <th className="px-3 py-2.5">Counter-account</th>
                <th className="px-3 py-2.5 text-right">Debit</th>
                <th className="px-3 py-2.5 text-right">Credit</th>
                <th className="px-3 py-2.5 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="bg-gray-50">
                <td className="px-3 py-2 text-[11px] text-gray-500">—</td>
                <td className="px-3 py-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-gray-100 text-gray-600 border-gray-300">Opening</span>
                </td>
                <td className="px-3 py-2 text-[11px] text-gray-500 italic" colSpan={3}>Opening balance</td>
                <td className="px-3 py-2"></td>
                <td className="px-3 py-2 text-right text-xs font-mono font-semibold">{fmtMoney(summary?.opening_balance)}</td>
              </tr>

              {ledger.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10">
                    <p className="text-sm text-gray-700 font-medium">No transactions yet</p>
                    <p className="text-xs text-gray-400 mt-1">Click <strong>Give Advance</strong> above to deposit money to this party.</p>
                  </td>
                </tr>
              ) : (
                ledger.map((e, i) => {
                  const meta = ENTRY_META[e.entry_type] || ENTRY_META.adjustment;
                  return (
                    <tr key={e.id} className="hover:bg-teal-50/30">
                      <td className="px-3 py-2 text-[11px] text-gray-700">{fmtDateLong(e.transaction_date)}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.tone}`}>
                          {meta.icon} {meta.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">{e.description || "—"}</td>
                      <td className="px-3 py-2 text-[11px] text-gray-500">
                        {e.account?.account_name || e.chart_account?.name || "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-mono text-blue-700">
                        {e.direction === "debit" ? fmtMoney(e.amount) : ""}
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-mono text-emerald-700">
                        {e.direction === "credit" ? fmtMoney(e.amount) : ""}
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-mono font-semibold text-gray-800">
                        {runningBalances[i] >= 0 ? "" : "−"}
                        {fmtMoney(Math.abs(runningBalances[i] ?? 0))}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {ledger.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={4} className="px-3 py-2 text-right text-xs text-gray-600">Closing balance</td>
                  <td className="px-3 py-2 text-right text-xs text-blue-700">{fmtMoney(summary?.total_debit)}</td>
                  <td className="px-3 py-2 text-right text-xs text-emerald-700">{fmtMoney(summary?.total_credit)}</td>
                  <td className={`px-3 py-2 text-right text-xs font-bold ${balanceTone.className}`}>
                    {balance >= 0 ? "" : "−"}{fmtMoney(Math.abs(balance))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────── subcomponents

function Stat({ label, value, tone, subtle }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-3.5 ring-1 ring-gray-100 ${subtle || ""}`}>
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold mt-1 ${tone}`}>{value} <span className="text-[10px] font-normal text-gray-500">AFN</span></p>
    </div>
  );
}

const ACTION_TONES = {
  blue:    { panel: "bg-blue-50 border-blue-200 hover:bg-blue-100",       label: "text-blue-800",    sub: "text-blue-600" },
  red:     { panel: "bg-red-50 border-red-200 hover:bg-red-100",          label: "text-red-800",     sub: "text-red-600" },
  emerald: { panel: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100", label: "text-emerald-800", sub: "text-emerald-600" },
  amber:   { panel: "bg-amber-50 border-amber-200 hover:bg-amber-100",    label: "text-amber-800",   sub: "text-amber-600" },
};

function ActionButton({ label, subtitle, tone = "blue", onClick, disabled, disabledHint }) {
  const t = ACTION_TONES[tone] || ACTION_TONES.blue;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-left border rounded-xl p-3.5 transition-colors ${t.panel} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      title={disabled && disabledHint ? disabledHint : undefined}
    >
      <p className={`text-sm font-bold ${t.label}`}>{label}</p>
      <p className={`text-[10px] mt-0.5 ${t.sub}`}>{disabled && disabledHint ? disabledHint : subtitle}</p>
    </button>
  );
}
