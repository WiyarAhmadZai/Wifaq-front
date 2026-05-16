import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  advance:       { label: "Advance",       tone: "bg-blue-50 text-blue-700 border-blue-200",          icon: "↑" },
  expense:       { label: "Expense",       tone: "bg-red-50 text-red-700 border-red-200",             icon: "↓" },
  repayment:     { label: "Repayment",     tone: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "↗" },
  reimbursement: { label: "Reimbursement", tone: "bg-amber-50 text-amber-700 border-amber-200",       icon: "⇩" },
  adjustment:    { label: "Adjustment",    tone: "bg-gray-100 text-gray-700 border-gray-300",         icon: "⚙" },
};

const fmtMoney = (n) => Number(n || 0).toLocaleString();
const fmtDateLong = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const todayIso = () => new Date().toISOString().slice(0, 10);

// Action configs — what the modal needs to render for each one.
const ACTIONS = {
  advance: {
    type: "advance",
    title: "Give Advance",
    blurb: "Deposit money with this party. Balance goes UP — they will owe the school this amount.",
    tone: "blue",
    requiresAccount: true,
    requiresExpenseAccount: false,
    mutationFn: givePartyAdvance,
  },
  expense: {
    type: "expense",
    title: "Record Expense",
    blurb: "Party spent the advance on something for the school. Balance goes DOWN. Pick the expense category the money went toward.",
    tone: "red",
    requiresAccount: false,
    requiresExpenseAccount: true,
    mutationFn: recordPartyExpense,
  },
  repayment: {
    type: "repayment",
    title: "Record Repayment",
    blurb: "Party returns unspent advance to the school. Balance goes DOWN.",
    tone: "emerald",
    requiresAccount: true,
    requiresExpenseAccount: false,
    mutationFn: recordPartyRepayment,
  },
  reimbursement: {
    type: "reimbursement",
    title: "Reimburse Party",
    blurb: "Party over-spent (or paid out of their own pocket); the school pays them back. Use when balance is negative.",
    tone: "amber",
    requiresAccount: true,
    requiresExpenseAccount: false,
    mutationFn: recordPartyReimbursement,
  },
};

export default function PartyLedger() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState([]);
  const [activeAction, setActiveAction] = useState(null);   // one of ACTIONS values or null
  const [toast, setToast] = useState(null);                  // { kind, message }

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const r = await getPartyLedger(id);
      setData(r.data?.data || null);
    } catch (e) {
      console.error(e);
      setLoadError(e.response?.data?.message || "Could not load ledger.");
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
        setExpenseAccounts(
          all
            .filter((a) => a.type === "Expense" && a.is_active !== false && (a.level ?? 1) >= 3)
            .sort((a, b) => String(a.code).localeCompare(String(b.code)))
        );
      })
      .catch(() => setExpenseAccounts([]));
  }, [load]);

  // Auto-dismiss toast after 2.5s.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleActionSuccess = async (label) => {
    setActiveAction(null);
    setToast({ kind: "success", message: `${label} recorded.` });
    await load();
  };

  const handleActionError = (label, err) => {
    setToast({
      kind: "error",
      message: err?.response?.data?.message || `Could not record ${label.toLowerCase()}.`,
    });
  };

  // ──────────── derived state
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
    ? { label: "owes school",        className: "text-red-700" }
    : balance < 0
      ? { label: "school owes party", className: "text-amber-700" }
      : { label: "settled",           className: "text-emerald-700" };

  // ──────────── render guards
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-sm text-red-600">{loadError}</p>
        <button onClick={() => navigate("/finance/parties")}
          className="mt-3 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs">Back to Parties</button>
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
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg text-xs font-semibold border ${
          toast.kind === "success"
            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
            : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {toast.message}
        </div>
      )}

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
          label="Give Advance"   subtitle="Deposit money"        tone="blue"
          onClick={() => setActiveAction(ACTIONS.advance)} disabled={!!activeAction}
        />
        <ActionButton
          label="Record Expense" subtitle="Party spent the money" tone="red"
          onClick={() => setActiveAction(ACTIONS.expense)} disabled={!!activeAction}
        />
        <ActionButton
          label="Record Repayment" subtitle="Party returned cash" tone="emerald"
          onClick={() => setActiveAction(ACTIONS.repayment)}
          disabled={!!activeAction || balance <= 0}
          disabledHint={balance <= 0 ? "Nothing owed by party" : null}
        />
        <ActionButton
          label="Reimburse" subtitle="School pays party" tone="amber"
          onClick={() => setActiveAction(ACTIONS.reimbursement)}
          disabled={!!activeAction || balance >= 0}
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
                      <td className="px-3 py-2 text-xs text-gray-700">
                        <div>{e.description || "—"}</div>
                        {e.vendor_invoice_number && (
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            Bill #<span className="font-mono">{e.vendor_invoice_number}</span>
                          </div>
                        )}
                        {Array.isArray(e.items) && e.items.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {e.items.map((it, idx) => (
                              <li key={idx} className="text-[10px] text-gray-500 flex justify-between gap-2 max-w-[260px]">
                                <span className="truncate">
                                  {it.name}
                                  {Number(it.quantity) ? ` ×${Number(it.quantity)}` : ""}
                                </span>
                                <span className="font-mono flex-shrink-0">
                                  {fmtMoney(it.line_total ?? (Number(it.quantity) || 0) * (Number(it.unit_price) || 0))}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
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

      {/* Action modal */}
      {activeAction && (
        <PartyActionModal
          action={activeAction}
          party={party}
          balance={balance}
          cashAccounts={cashAccounts}
          expenseAccounts={expenseAccounts}
          onClose={() => setActiveAction(null)}
          onSuccess={() => handleActionSuccess(activeAction.title)}
          onError={(err) => handleActionError(activeAction.title, err)}
          partyId={id}
        />
      )}
    </div>
  );
}

// ─────────────────────── Action modal ────────────────────────

const TONE = {
  blue:    { accent: "text-blue-700",    btn: "bg-blue-600 hover:bg-blue-700",       headerBg: "bg-blue-50/50",    iconBg: "bg-blue-100 text-blue-700" },
  red:     { accent: "text-red-700",     btn: "bg-red-600 hover:bg-red-700",         headerBg: "bg-red-50/50",     iconBg: "bg-red-100 text-red-700" },
  emerald: { accent: "text-emerald-700", btn: "bg-emerald-600 hover:bg-emerald-700", headerBg: "bg-emerald-50/50", iconBg: "bg-emerald-100 text-emerald-700" },
  amber:   { accent: "text-amber-700",   btn: "bg-amber-600 hover:bg-amber-700",     headerBg: "bg-amber-50/50",   iconBg: "bg-amber-100 text-amber-700" },
};

// Per-action glyph for the modal header icon circle.
const ACTION_ICON = {
  advance: "↑",
  expense: "↓",
  repayment: "↗",
  reimbursement: "⇩",
};

function PartyActionModal({
  action, party, balance, cashAccounts, expenseAccounts,
  onClose, onSuccess, onError, partyId,
}) {
  const t = TONE[action.tone] || TONE.blue;

  const [amount, setAmount]               = useState("");
  const [accountId, setAccountId]         = useState("");
  const [expenseChartId, setExpenseChartId] = useState("");
  const [date, setDate]                   = useState(todayIso());
  const [note, setNote]                   = useState("");
  const [billNumber, setBillNumber]       = useState("");
  const [items, setItems]                 = useState([{ name: "", quantity: 1, unit_price: "" }]);
  const [error, setError]                 = useState(null);
  const [submitting, setSubmitting]       = useState(false);

  // The bill number + itemised breakdown only make sense for an expense
  // (the party went and bought specific things and got a receipt).
  const isExpense = action.requiresExpenseAccount;

  const updateItem = (i, patch) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const addItem    = () => setItems((arr) => [...arr, { name: "", quantity: 1, unit_price: "" }]);
  const removeItem = (i) =>
    setItems((arr) => (arr.length === 1 ? arr : arr.filter((_, idx) => idx !== i)));

  const itemsSubtotal = items.reduce(
    (s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0),
    0
  );

  // For an itemised expense the amount IS the sum of the items — it's never
  // typed by hand. Every other action (advance/repayment/reimburse) has no
  // items, so the amount is entered manually.
  const amountNum = isExpense ? itemsSubtotal : (Number(amount) || 0);

  const overBalance =
    action.type === "repayment" && amountNum > 0 && amountNum > balance;
  // For reimbursement, the party's balance is negative; the school can't repay
  // more than what it owes.
  const overOwed =
    action.type === "reimbursement" && amountNum > 0 && amountNum > Math.abs(balance);
  // Expense beyond the party's advance — not blocked (they may have paid out
  // of pocket), but worth flagging so it's a deliberate choice.
  const overAdvance =
    action.type === "expense" && amountNum > 0 && balance > 0 && amountNum > balance;

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (action.requiresExpenseAccount && !expenseChartId) {
      setError("Pick an expense category.");
      return;
    }
    if (isExpense && amountNum <= 0) {
      setError("Add at least one item with a price — the total can't be zero.");
      return;
    }
    if (!isExpense && amountNum <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }
    if (action.requiresAccount && !accountId) {
      setError("Pick a cash / bank account.");
      return;
    }

    const payload = { amount: amountNum, date, note: note || null };
    if (action.requiresAccount) payload.account_id = Number(accountId);
    if (action.requiresExpenseAccount) payload.expense_chart_account_id = Number(expenseChartId);

    if (isExpense) {
      payload.vendor_invoice_number = billNumber.trim() || null;
      // Only send items that actually have a name — blank rows are ignored.
      const clean = items
        .filter((it) => it.name.trim())
        .map((it) => ({
          name: it.name.trim(),
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price) || 0,
        }));
      payload.items = clean.length ? clean : null;
    }

    setSubmitting(true);
    try {
      await action.mutationFn(partyId, payload);
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.message || "Server rejected this entry.");
      onError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const labelCls = "block text-[11px] font-semibold text-gray-600 mb-1.5";
  const inputCls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition";

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${isExpense ? "max-w-2xl" : "max-w-lg"} max-h-[90vh] flex flex-col overflow-hidden`}>

        {/* ── Sticky header ─────────────────────────────────────── */}
        <div className={`flex items-start gap-3 px-6 py-4 border-b border-gray-100 ${t.headerBg}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${t.iconBg}`}>
            <span className="text-lg leading-none font-bold">{ACTION_ICON[action.type] ?? "•"}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={`text-base font-bold ${t.accent}`}>{action.title}</h3>
            <p className="text-[11px] text-gray-500 leading-snug mt-0.5">{action.blurb}</p>
          </div>
          <button type="button" onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Party context strip */}
        <div className="px-6 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-[11px]">
          <span className="text-gray-500">Party: <span className="font-semibold text-gray-800">{party.full_name}</span></span>
          <span className="text-gray-500">
            Balance{" "}
            <span className={`font-bold ${balance > 0 ? "text-red-600" : balance < 0 ? "text-amber-600" : "text-emerald-600"}`}>
              {balance >= 0 ? "" : "−"}{fmtMoney(Math.abs(balance))} AFN
            </span>
          </span>
        </div>

        <form onSubmit={submit} className="flex flex-col min-h-0 flex-1">
          {/* ── Scrollable body ─────────────────────────────────── */}
          <div className="px-6 py-5 space-y-5 overflow-y-auto">

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2.5 flex items-start gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Amount + date.
                · Expense: amount is derived from the items below, so we only
                  ask for the date here (full width). The computed total shows
                  in the items card footer.
                · Other actions: manual amount + date side by side. */}
            {isExpense ? (
              <div>
                <label className={labelCls}>Date *</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={inputCls} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Amount (AFN) *</label>
                  <input
                    type="number" inputMode="decimal" min="0.01" step="0.01"
                    value={amount} onChange={(e) => setAmount(e.target.value)}
                    autoFocus required placeholder="0.00"
                    className={`${inputCls} text-right font-mono`}
                  />
                  {overBalance && (
                    <p className="text-[11px] text-amber-700 mt-1.5">⚠ Larger than amount owed — party would over-pay.</p>
                  )}
                  {overOwed && (
                    <p className="text-[11px] text-amber-700 mt-1.5">⚠ Larger than what school owes — would over-reimburse.</p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>Date *</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={inputCls} />
                </div>
              </div>
            )}

            {/* Account picker */}
            {action.requiresAccount && (
              <div>
                <label className={labelCls}>
                  {action.type === "advance" ? "Money comes from" : action.type === "repayment" ? "Money goes to" : "Money paid from"} *
                </label>
                {cashAccounts.length === 0 ? (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    No cash / bank accounts found. Add one under Setup → Accounts first.
                  </p>
                ) : (
                  <div className="max-h-44 overflow-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {cashAccounts.map((a) => {
                      const sel = String(accountId) === String(a.id);
                      return (
                        <button key={a.id} type="button" onClick={() => setAccountId(a.id)}
                          className={`w-full text-left px-3 py-2.5 flex items-center justify-between transition-colors ${
                            sel ? "bg-teal-50 ring-1 ring-inset ring-teal-200" : "hover:bg-gray-50"
                          }`}>
                          <div>
                            <p className={`text-sm font-semibold ${sel ? "text-teal-800" : "text-gray-800"}`}>{a.account_name}</p>
                            <p className="text-[11px] text-gray-400 capitalize">{a.account_type}</p>
                          </div>
                          <p className="text-[11px] text-gray-500 font-mono">{fmtMoney(a.current_balance)} AFN</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Expense category picker */}
            {action.requiresExpenseAccount && (
              <div>
                <label className={labelCls}>Expense category *</label>
                {expenseAccounts.length === 0 ? (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    No expense chart accounts found. Seed the chart of accounts first.
                  </p>
                ) : (
                  <div className="max-h-40 overflow-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {expenseAccounts.map((c) => {
                      const sel = String(expenseChartId) === String(c.id);
                      return (
                        <button key={c.id} type="button" onClick={() => setExpenseChartId(c.id)}
                          className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                            sel ? "bg-teal-50 ring-1 ring-inset ring-teal-200" : "hover:bg-gray-50"
                          }`}>
                          <p className={`text-sm font-semibold truncate ${sel ? "text-teal-800" : "text-gray-800"}`}>{c.name}</p>
                          <span className={`text-[11px] font-mono flex-shrink-0 px-2 py-0.5 rounded ${
                            sel ? "bg-teal-100 text-teal-800" : "bg-gray-100 text-gray-600"
                          }`}>{c.code}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Bill number + purchased items — expense only */}
            {isExpense && (
              <>
                <div>
                  <label className={labelCls}>Bill / invoice number</label>
                  <input
                    type="text" value={billNumber} onChange={(e) => setBillNumber(e.target.value)}
                    maxLength={100} placeholder="Number printed on the vendor's receipt"
                    className={inputCls}
                  />
                </div>

                {/* Items card */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                    <div>
                      <p className="text-[11px] font-semibold text-gray-700">Purchased items</p>
                      <p className="text-[10px] text-gray-400">What the money was actually spent on</p>
                    </div>
                    <button type="button" onClick={addItem}
                      className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-[11px] font-semibold text-teal-600 hover:bg-teal-50 hover:border-teal-200 transition flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Add item
                    </button>
                  </div>

                  {/* column header */}
                  <div className="grid grid-cols-[1fr_4rem_6rem_5.5rem_1.5rem] gap-2 px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide bg-white border-b border-gray-50">
                    <span>Item</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Unit price</span>
                    <span className="text-right">Total</span>
                    <span></span>
                  </div>

                  <div className="divide-y divide-gray-50 max-h-52 overflow-y-auto">
                    {items.map((it, i) => (
                      <div key={i} className="grid grid-cols-[1fr_4rem_6rem_5.5rem_1.5rem] gap-2 px-4 py-2 items-center">
                        <input
                          type="text" value={it.name}
                          onChange={(e) => updateItem(i, { name: e.target.value })}
                          placeholder="e.g. A4 paper ream"
                          className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                        />
                        <input
                          type="number" min="0" step="0.01" value={it.quantity}
                          onChange={(e) => updateItem(i, { quantity: e.target.value })}
                          className="px-2 py-1.5 text-sm text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                        />
                        <input
                          type="number" min="0" step="0.01" value={it.unit_price}
                          onChange={(e) => updateItem(i, { unit_price: e.target.value })}
                          className="px-2 py-1.5 text-sm text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                        />
                        <span className="text-right text-sm font-mono text-gray-700">
                          {fmtMoney((Number(it.quantity) || 0) * (Number(it.unit_price) || 0))}
                        </span>
                        <button type="button" onClick={() => removeItem(i)}
                          disabled={items.length === 1}
                          className="w-6 h-6 rounded-md flex items-center justify-center text-gray-300 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent transition">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* The total IS the amount that posts to the books —
                      computed from the rows above, shown as the headline. */}
                  <div className="flex items-center justify-between px-4 py-3 bg-teal-50 border-t border-teal-100">
                    <span className="text-[11px] font-semibold text-teal-700 uppercase tracking-wide">
                      Total expense
                    </span>
                    <span className="text-lg font-bold font-mono text-teal-800">
                      {fmtMoney(itemsSubtotal)} <span className="text-xs font-normal">AFN</span>
                    </span>
                  </div>
                </div>

                {overAdvance && (
                  <p className="text-[11px] text-amber-700">
                    ⚠ Total exceeds the party's current advance ({fmtMoney(balance)} AFN) — the school will owe them the difference.
                  </p>
                )}
              </>
            )}

            {/* Note */}
            <div>
              <label className={labelCls}>Note <span className="font-normal text-gray-400">(optional)</span></label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                placeholder="Reference, context, what it was for…"
                className={inputCls} />
            </div>
          </div>

          {/* ── Sticky footer ───────────────────────────────────── */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium transition">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className={`px-5 py-2.5 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition ${t.btn}`}>
              {submitting ? "Saving…" : `Confirm ${action.title}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────── Subcomponents ──────────────────────

function Stat({ label, value, tone, subtle }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-3.5 ring-1 ring-gray-100 ${subtle || ""}`}>
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold mt-1 ${tone}`}>{value} <span className="text-[10px] font-normal text-gray-500">AFN</span></p>
    </div>
  );
}

const ACTION_TONES = {
  blue:    { panel: "bg-blue-50 border-blue-200 hover:bg-blue-100",          label: "text-blue-800",    sub: "text-blue-600" },
  red:     { panel: "bg-red-50 border-red-200 hover:bg-red-100",             label: "text-red-800",     sub: "text-red-600" },
  emerald: { panel: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100", label: "text-emerald-800", sub: "text-emerald-600" },
  amber:   { panel: "bg-amber-50 border-amber-200 hover:bg-amber-100",       label: "text-amber-800",   sub: "text-amber-600" },
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
