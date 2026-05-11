import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAccounts,
  deleteAccount,
  depositToAccount,
  withdrawFromAccount,
  transferBetweenAccounts,
  getAccountMovements,
  getChartOfAccounts,
} from "../../api/financial";
import Swal from "sweetalert2";

const typeConfig = {
  bank:    { label: "Bank",    color: "bg-blue-50 text-blue-700 border-blue-200",       icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z", iconBg: "bg-blue-100 text-blue-600" },
  cash:    { label: "Cash",    color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z", iconBg: "bg-emerald-100 text-emerald-600" },
  digital: { label: "Digital", color: "bg-purple-50 text-purple-700 border-purple-200",   icon: "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z", iconBg: "bg-purple-100 text-purple-600" },
};

// Chart-of-accounts types that are valid offsets for cash movements.
// Deposits land against Income / Equity / Liability (money received against
// revenue, capital, or a liability we're discharging). Withdrawals land
// against Expense / Equity (paying out for a cost, or owner taking money out).
// We never let users pick Asset rows — those are other money locations, which
// is the Transfer flow, not Deposit/Withdraw.
const DEPOSIT_TYPES  = ["Income", "Equity", "Liability"];
const WITHDRAW_TYPES = ["Expense", "Equity"];

// Only show leaf chart accounts (skip parent / header rows like
// "4000 Income" or "5200 Administrative Expenses"). Anything at level 3+ in
// the seeded chart is a real bookable category.
const isPickableLeaf = (row) => row.is_active !== false && (row.level ?? 1) >= 3;

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => Number(n || 0).toLocaleString();

export default function Accounts() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [chart, setChart] = useState([]);          // chart_of_accounts rows → code → id lookup
  const [loading, setLoading] = useState(false);

  // Modal state — one object describes the open modal.
  // shape: { kind: 'deposit'|'withdraw'|'transfer'|'movements', account, ... }
  const [modal, setModal] = useState(null);

  useEffect(() => {
    fetchAccounts();
    getChartOfAccounts()
      .then((r) => setChart(r.data?.data || []))
      .catch(() => setChart([]));
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await getAccounts();
      setItems(response.data?.data || []);
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Derive the deposit / withdraw reason lists straight from the chart of
  // accounts. Adding or renaming a chart row in the seeder is the only thing
  // needed to extend these — no frontend change required.
  const depositReasons = useMemo(
    () => (chart || [])
      .filter(isPickableLeaf)
      .filter((c) => DEPOSIT_TYPES.includes(c.type))
      .sort((a, b) => String(a.code).localeCompare(String(b.code))),
    [chart]
  );
  const withdrawReasons = useMemo(
    () => (chart || [])
      .filter(isPickableLeaf)
      .filter((c) => WITHDRAW_TYPES.includes(c.type))
      .sort((a, b) => String(a.code).localeCompare(String(b.code))),
    [chart]
  );

  const handleDelete = async (id) => {
    const r = await Swal.fire({
      title: "Delete account?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Delete",
    });
    if (r.isConfirmed) {
      try {
        await deleteAccount(id);
        setItems((p) => p.filter((i) => i.id !== id));
        Swal.fire("Deleted!", "", "success");
      } catch (error) {
        Swal.fire("Error", error.response?.data?.message || "Failed to delete", "error");
      }
    }
  };

  const totalBalance = items.reduce((s, i) => s + (Number(i.current_balance) || 0), 0);

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Accounts</h2>
          <p className="text-xs text-gray-500">Bank accounts, cash boxes, and digital wallets. Use Deposit / Withdraw / Transfer to move money.</p>
        </div>
        <button onClick={() => navigate("/finance/accounts/create")}
          className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Account
        </button>
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-4 mb-4 text-white">
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-teal-200">Total Accounts</p>
            <p className="text-2xl font-bold">{items.length}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-teal-200">Total Cash Position</p>
            <p className="text-2xl font-bold">{fmt(totalBalance)} <span className="text-sm font-normal">AFN</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((acc) => {
          const tc = typeConfig[acc.account_type] || typeConfig.bank;
          return (
            <div key={acc.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-10 h-10 rounded-xl ${tc.iconBg} flex items-center justify-center`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tc.icon} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">{acc.account_name}</p>
                    <p className="text-[10px] text-gray-400">{acc.account_number && acc.account_number !== "-" ? acc.account_number : "No account number"}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${tc.color}`}>{tc.label}</span>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <p className="text-[10px] text-gray-500 mb-0.5">Current Balance</p>
                <p className={`text-xl font-bold ${Number(acc.current_balance) < 0 ? "text-red-700" : "text-teal-700"}`}>
                  {fmt(acc.current_balance)} <span className="text-xs font-normal">{acc.currency || "AFN"}</span>
                </p>
                <p className="text-[10px] text-gray-400 mt-1">Opening: {fmt(acc.opening_balance)} AFN</p>
              </div>

              {/* Money actions */}
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                <button onClick={() => setModal({ kind: "deposit", account: acc })}
                  className="py-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 flex items-center justify-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m-7 7l7-7 7 7" /></svg>
                  Deposit
                </button>
                <button onClick={() => setModal({ kind: "withdraw", account: acc })}
                  className="py-1.5 text-[10px] font-semibold text-red-700 bg-red-50 rounded-lg hover:bg-red-100 flex items-center justify-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m-7-7l7 7 7-7" /></svg>
                  Withdraw
                </button>
                <button onClick={() => setModal({ kind: "transfer", account: acc })}
                  className="py-1.5 text-[10px] font-semibold text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 flex items-center justify-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m-4 6H4m0 0l4 4m-4-4l4-4" /></svg>
                  Transfer
                </button>
              </div>

              <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100">
                <button onClick={() => setModal({ kind: "movements", account: acc })} className="flex-1 py-1 text-[10px] font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100">History</button>
                <button onClick={() => navigate(`/finance/accounts/edit/${acc.id}`)} className="flex-1 py-1 text-[10px] font-medium text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100">Edit</button>
                <button onClick={() => handleDelete(acc.id)} className="flex-1 py-1 text-[10px] font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100">Delete</button>
              </div>
            </div>
          );
        })}

        {/* Add new card */}
        <button onClick={() => navigate("/finance/accounts/create")}
          className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:border-teal-400 hover:bg-teal-50 transition-all text-gray-400 hover:text-teal-600 min-h-[180px]">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-xs font-medium">Add New Account</span>
        </button>
      </div>

      {loading && <p className="text-center text-xs text-gray-400 py-4">Loading…</p>}

      {/* Modals */}
      {modal?.kind === "deposit" && (
        <CashMovementModal
          title="Deposit Money"
          accentClass="text-emerald-700"
          actionLabel="Confirm deposit"
          account={modal.account}
          reasons={depositReasons}
          reasonLabel="Where is this money coming from?"
          emptyHint="No Income / Equity / Liability chart accounts found. Seed the chart of accounts first."
          onClose={() => setModal(null)}
          onSubmit={async ({ amount, chartAccountId, note, date }) => {
            await depositToAccount(modal.account.id, {
              amount,
              source_chart_account_id: chartAccountId,
              note,
              date,
            });
          }}
          onSuccess={() => { setModal(null); fetchAccounts(); }}
        />
      )}

      {modal?.kind === "withdraw" && (
        <CashMovementModal
          title="Withdraw Money"
          accentClass="text-red-700"
          actionLabel="Confirm withdrawal"
          account={modal.account}
          reasons={withdrawReasons}
          reasonLabel="Where is this money going?"
          emptyHint="No Expense / Equity chart accounts found. Seed the chart of accounts first."
          warnIfOverBalance
          onClose={() => setModal(null)}
          onSubmit={async ({ amount, chartAccountId, note, date }) => {
            await withdrawFromAccount(modal.account.id, {
              amount,
              destination_chart_account_id: chartAccountId,
              note,
              date,
            });
          }}
          onSuccess={() => { setModal(null); fetchAccounts(); }}
        />
      )}

      {modal?.kind === "transfer" && (
        <TransferModal
          fromAccount={modal.account}
          allAccounts={items}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); fetchAccounts(); }}
        />
      )}

      {modal?.kind === "movements" && (
        <MovementsModal account={modal.account} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

/* ───────────────────────── Deposit / Withdraw modal ─────────────────────── */

function CashMovementModal({
  title,
  accentClass,
  actionLabel,
  account,
  reasons,           // array of chart_of_accounts rows: { id, code, name, type, description }
  reasonLabel,
  emptyHint,
  warnIfOverBalance,
  onClose,
  onSubmit,
  onSuccess,
}) {
  const [amount, setAmount] = useState("");
  const [chartAccountId, setChartAccountId] = useState(reasons[0]?.id ?? null);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());
  const [submitting, setSubmitting] = useState(false);

  const amountNumber = Number(amount) || 0;
  const overBalance = warnIfOverBalance && amountNumber > Number(account.current_balance || 0);

  const handle = async (e) => {
    e.preventDefault();
    if (amountNumber <= 0) {
      Swal.fire("Enter an amount", "The amount must be greater than zero.", "warning");
      return;
    }
    if (!chartAccountId) {
      Swal.fire("Pick a reason", "Choose the chart account this money is offset against.", "warning");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ amount: amountNumber, chartAccountId, note: note || null, date });
      Swal.fire({
        toast: true, position: "top-end", icon: "success",
        title: `${title} recorded`, timer: 1500, showConfirmButton: false,
      });
      onSuccess();
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Could not record this movement.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell onClose={onClose}>
      <form onSubmit={handle} className="space-y-4">
        <div>
          <h3 className={`text-base font-bold ${accentClass}`}>{title}</h3>
          <p className="text-[11px] text-gray-500">
            Account: <strong>{account.account_name}</strong> · Current balance {fmt(account.current_balance)} AFN
          </p>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1.5">{reasonLabel} *</label>
          {reasons.length === 0 ? (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">{emptyHint}</p>
          ) : (
            <div className="max-h-60 overflow-auto border border-gray-100 rounded-lg divide-y divide-gray-50 bg-white">
              {reasons.map((r) => {
                const selected = String(chartAccountId) === String(r.id);
                return (
                  <button key={r.id} type="button"
                    onClick={() => setChartAccountId(r.id)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between gap-3 transition-colors ${selected ? "bg-teal-50" : "hover:bg-gray-50"}`}>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold truncate ${selected ? "text-teal-800" : "text-gray-800"}`}>{r.name}</p>
                      {r.description && (
                        <p className="text-[10px] text-gray-500 truncate">{r.description}</p>
                      )}
                    </div>
                    <span className={`text-[10px] font-mono flex-shrink-0 px-1.5 py-0.5 rounded ${selected ? "bg-teal-100 text-teal-800" : "bg-gray-100 text-gray-600"}`}>
                      {r.code}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Amount (AFN) *</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              step="0.01" min="0.01" required
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
            {overBalance && (
              <p className="text-[10px] text-amber-700 mt-1">
                ⚠ Larger than current balance — account will go negative.
              </p>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Note</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
            placeholder="Optional context — receipt number, reference, who handed it over, …"
            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
        </div>

        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button type="submit" disabled={submitting}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-semibold disabled:opacity-50">
            {submitting ? "Saving…" : actionLabel}
          </button>
          <button type="button" onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-xs font-medium">
            Cancel
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ─────────────────────────── Transfer modal ────────────────────────────── */

function TransferModal({ fromAccount, allAccounts, onClose, onSuccess }) {
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());
  const [submitting, setSubmitting] = useState(false);

  const destinations = allAccounts.filter((a) => a.id !== fromAccount.id);
  const amountNumber = Number(amount) || 0;
  const overBalance = amountNumber > Number(fromAccount.current_balance || 0);

  const handle = async (e) => {
    e.preventDefault();
    if (!toId) {
      Swal.fire("Pick a destination", "Choose which account the money is moving to.", "warning");
      return;
    }
    if (amountNumber <= 0) {
      Swal.fire("Enter an amount", "The amount must be greater than zero.", "warning");
      return;
    }
    setSubmitting(true);
    try {
      await transferBetweenAccounts(fromAccount.id, {
        destination_account_id: toId,
        amount: amountNumber,
        note: note || null,
        date,
      });
      Swal.fire({
        toast: true, position: "top-end", icon: "success",
        title: "Transfer recorded", timer: 1500, showConfirmButton: false,
      });
      onSuccess();
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Could not transfer.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell onClose={onClose}>
      <form onSubmit={handle} className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-indigo-700">Transfer Money</h3>
          <p className="text-[11px] text-gray-500">Move cash between two of the school's own accounts. No net change in total cash.</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-500">From</p>
              <p className="font-semibold text-gray-800">{fromAccount.account_name}</p>
              <p className="text-[10px] text-gray-400">{fmt(fromAccount.current_balance)} AFN available</p>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            <div className="text-right">
              <p className="text-[10px] text-gray-500">To</p>
              <p className="font-semibold text-gray-800">
                {destinations.find((a) => String(a.id) === String(toId))?.account_name || "— pick below —"}
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Destination account *</label>
          <div className="max-h-48 overflow-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
            {destinations.length === 0 ? (
              <p className="text-center py-6 text-xs text-gray-400 italic">No other accounts to transfer to.</p>
            ) : destinations.map((a) => {
              const selected = String(toId) === String(a.id);
              return (
                <button key={a.id} type="button" onClick={() => setToId(a.id)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${selected ? "bg-indigo-50" : "hover:bg-gray-50"}`}>
                  <div>
                    <p className={`text-xs font-semibold ${selected ? "text-indigo-800" : "text-gray-800"}`}>{a.account_name}</p>
                    <p className="text-[10px] text-gray-400 capitalize">{a.account_type}</p>
                  </div>
                  <p className="text-[10px] text-gray-500">{fmt(a.current_balance)} AFN</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Amount (AFN) *</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} step="0.01" min="0.01" required
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
            {overBalance && (
              <p className="text-[10px] text-amber-700 mt-1">
                ⚠ Larger than source balance — source will go negative.
              </p>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Note</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Optional context"
            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
        </div>

        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button type="submit" disabled={submitting || !toId}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-semibold disabled:opacity-50">
            {submitting ? "Transferring…" : "Confirm transfer"}
          </button>
          <button type="button" onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-xs font-medium">
            Cancel
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ─────────────────────────── Movements / history modal ──────────────────── */

function MovementsModal({ account, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAccountMovements(account.id, { per_page: 100 })
      .then((r) => setRows(r.data?.data?.movements || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [account.id]);

  return (
    <ModalShell onClose={onClose} wide>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-bold text-gray-800">{account.account_name} — Movement history</h3>
          <p className="text-[11px] text-gray-500">Every journal entry line that touched this account, most recent first.</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
      </div>

      {loading ? (
        <p className="text-center text-xs text-gray-400 py-6">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-center text-xs text-gray-400 py-6 italic">No movements yet.</p>
      ) : (
        <div className="border border-gray-100 rounded-lg overflow-hidden">
          <table className="w-full text-[11px]">
            <thead className="bg-gray-50 text-gray-500 uppercase text-[9px]">
              <tr>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Description</th>
                <th className="text-right px-3 py-2">In</th>
                <th className="text-right px-3 py-2">Out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{r.journal_entry?.transaction_date}</td>
                  <td className="px-3 py-2 text-gray-800">{r.description || r.journal_entry?.description}</td>
                  <td className="px-3 py-2 text-right text-emerald-700 font-medium">
                    {Number(r.debit) > 0 ? fmt(r.debit) : ""}
                  </td>
                  <td className="px-3 py-2 text-right text-red-700 font-medium">
                    {Number(r.credit) > 0 ? fmt(r.credit) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ModalShell>
  );
}

/* ─────────────────────────── Modal shell ───────────────────────────────── */

function ModalShell({ children, onClose, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`bg-white rounded-2xl shadow-xl ${wide ? "max-w-3xl w-full" : "max-w-md w-full"} p-5 my-8`}>
        {children}
      </div>
    </div>
  );
}
