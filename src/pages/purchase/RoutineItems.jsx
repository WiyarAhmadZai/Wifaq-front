import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listRoutineItems, deleteRoutineItem, recordRoutinePurchase } from "../../api/routineItems";
import { getAccounts, getParties } from "../../api/financial";
import Swal from "sweetalert2";

import { fmtDate } from "../../utils/formErrors";
import { DateField } from "../../components/hr/HrUI";
// Linked-stock state badge palette (matches the Stock page).
const STOCK_STATE = {
  ok:  { label: "OK",  cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  low: { label: "Low", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  out: { label: "Out", cls: "bg-red-50 text-red-700 border-red-200" },
};

const fmt = (n) => Number(n || 0).toLocaleString();
const today = () => new Date().toISOString().slice(0, 10);

// "Due now" includes things with no next_due_date (never purchased) — same
// rule the backend scope uses.
const isDue = (row) => !row.next_due_date || row.next_due_date <= today();

const daysUntilDue = (row) => {
  if (!row.next_due_date) return 0;
  const diff = (new Date(row.next_due_date) - new Date(today())) / 86400000;
  return Math.round(diff);
};

export default function RoutineItems() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");           // all | due | active | inactive
  const [search, setSearch] = useState("");
  const [buyTarget, setBuyTarget] = useState(null);      // routine row → opens Record Purchase modal
  const [accounts, setAccounts] = useState([]);
  const [staffParties, setStaffParties] = useState([]);

  useEffect(() => { fetchItems(); /* eslint-disable-next-line */ }, [filter]);

  // Payment sources for the Record Purchase modal — loaded once.
  useEffect(() => {
    getAccounts({ per_page: 100 })
      .then((r) => setAccounts(r.data?.data?.data || r.data?.data || []))
      .catch(() => setAccounts([]));
    getParties({ party_type: "staff", per_page: 200 })
      .then((r) => setStaffParties(r.data?.data?.data || r.data?.data || []))
      .catch(() => setStaffParties([]));
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = { per_page: 200 };
      if (filter === "active")   params.active_only = true;
      if (filter === "inactive") params.active_only = false;
      if (filter === "due")      params.due_only = true;
      if (search) params.search = search;
      const r = await listRoutineItems(params);
      // Backend returns Laravel paginator → response.data.data.data
      const rows = r.data?.data?.data || r.data?.data || [];
      setItems(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const r = await Swal.fire({
      title: "Delete this routine item?",
      text: "Future auto-generation for this item will stop.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Delete",
    });
    if (!r.isConfirmed) return;
    try {
      await deleteRoutineItem(id);
      setItems((p) => p.filter((i) => i.id !== id));
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to delete", "error");
    }
  };

  // Called by the Record Purchase modal after a successful one-step buy.
  const onPurchased = async (pr) => {
    setBuyTarget(null);
    await fetchItems();
    const r = await Swal.fire({
      icon: "success",
      title: "Routine purchase recorded",
      text: `${pr?.request_number || "Purchase"} completed — journal posted and stock updated.`,
      showCancelButton: true,
      confirmButtonText: "View the record",
      cancelButtonText: "Done",
      confirmButtonColor: "#0d9488",
    });
    if (r.isConfirmed && pr?.id) navigate(`/purchase/purchase-requests/show/${pr.id}`);
  };

  const stats = useMemo(() => {
    const s = { total: items.length, due: 0, active: 0 };
    items.forEach((i) => {
      if (i.is_active) s.active++;
      if (isDue(i) && i.is_active) s.due++;
    });
    return s;
  }, [items]);

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Routine Items</h2>
          <p className="text-xs text-gray-500">Recurring purchases on a schedule. When an item reaches its purchase date it's flagged <span className="text-red-600 font-semibold">Due</span> — record the buy in one step (no approval needed).</p>
        </div>
        <button onClick={() => navigate("/purchase/routine-items/create")}
          className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New routine
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <SummaryCard label="Total" value={stats.total} accent="from-teal-600 to-teal-700" />
        <SummaryCard label="Active" value={stats.active} accent="from-emerald-500 to-emerald-600" />
        <SummaryCard label="Due now" value={stats.due} accent={stats.due > 0 ? "from-red-500 to-red-600" : "from-gray-500 to-gray-600"} />
      </div>

      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1.5 flex-wrap">
          {["all", "due", "active", "inactive"].map((t) => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold capitalize transition-colors ${
                filter === t ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>{t}</button>
          ))}
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} onBlur={fetchItems}
          placeholder="Search by item name…"
          className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-[11px]">
          <thead className="bg-gray-50 text-gray-500 uppercase text-[9px]">
            <tr>
              <th className="text-left px-3 py-2 w-8"></th>
              <th className="text-left px-3 py-2">Item</th>
              <th className="text-right px-3 py-2">Qty / cycle</th>
              <th className="text-right px-3 py-2">Est. price</th>
              <th className="text-left px-3 py-2">Linked stock</th>
              <th className="text-left px-3 py-2">Schedule</th>
              <th className="text-center px-3 py-2">Status</th>
              <th className="text-center px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8 text-xs text-gray-400">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-xs text-gray-400 italic">No routine items yet.</td></tr>
            ) : items.map((row) => {
              const due = isDue(row) && row.is_active;
              const daysOff = daysUntilDue(row);
              const overdue = due && row.next_due_date && daysOff < 0;
              // Visual weight follows urgency: overdue (strong red) →
              // due (red) → upcoming/ok (muted) → inactive (grey).
              const rowCls = !row.is_active
                ? "opacity-55"
                : overdue ? "bg-red-50"
                : due ? "bg-amber-50/50"
                : "";
              const accent = !row.is_active ? "border-gray-200"
                : overdue ? "border-red-500"
                : due ? "border-amber-400"
                : "border-transparent";
              return (
                <tr key={row.id} className={`hover:bg-gray-50/80 cursor-pointer ${rowCls}`}
                    onClick={() => navigate(`/purchase/routine-items/show/${row.id}`)}>
                  <td className={`px-0 border-l-4 ${accent}`}></td>
                  <td className="px-3 py-2.5">
                    <p className="text-gray-800 font-semibold">{row.item_name}</p>
                    <p className="text-[10px] text-gray-400">every {row.frequency_days} days</p>
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-700 font-mono">
                    {fmt(row.standard_quantity)} <span className="text-[10px] text-gray-400">{row.unit}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-700 font-mono">{row.estimated_unit_price ? fmt(row.estimated_unit_price) : "—"}</td>
                  <td className="px-3 py-2.5">
                    {row.stock ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-gray-700">{row.stock.item_name}</span>
                        <span className="text-[10px] text-gray-400 font-mono">{fmt(row.stock.quantity)} {row.stock.unit}</span>
                        {(() => {
                          const ss = STOCK_STATE[row.stock.stock_state] || STOCK_STATE.ok;
                          return <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${ss.cls}`}>{ss.label}</span>;
                        })()}
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-300">not linked</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">
                    <p>Last: <span className="text-gray-500">{fmtDate(row.last_purchase_date)}</span></p>
                    <p className="text-[10px] text-gray-400">Next: {fmtDate(row.next_due_date)}</p>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {!row.is_active ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-gray-100 text-gray-500 border-gray-200">Inactive</span>
                    ) : overdue ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-red-100 text-red-700 border-red-300">
                        ⚠ {Math.abs(daysOff)}d overdue
                      </span>
                    ) : due ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-100 text-amber-700 border-amber-300">
                        DUE NOW
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                        in {daysOff}d
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {/* Record Purchase only appears when it's actually time
                        to buy (due + active). Off-cycle rows just show edit. */}
                    {due ? (
                      <button onClick={() => setBuyTarget(row)}
                        className={`px-2.5 py-1 text-[10px] font-bold text-white rounded mr-2 ${overdue ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}`}>
                        Record Purchase
                      </button>
                    ) : row.is_active ? (
                      <button onClick={() => setBuyTarget(row)}
                        title="Not due yet — buy early anyway"
                        className="px-2 py-1 text-[10px] font-semibold text-gray-500 border border-gray-200 rounded hover:bg-gray-50 mr-2">
                        Buy early
                      </button>
                    ) : null}
                    <button onClick={() => navigate(`/purchase/routine-items/edit/${row.id}`)}
                      className="text-[10px] text-teal-600 hover:text-teal-800 mr-2">Edit</button>
                    <button onClick={() => handleDelete(row.id)}
                      className="text-[10px] text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {buyTarget && (
        <RecordPurchaseModal
          item={buyTarget}
          accounts={accounts}
          staffParties={staffParties}
          onClose={() => setBuyTarget(null)}
          onDone={onPurchased}
        />
      )}
    </div>
  );
}

/* ── Record Purchase modal — one-step routine buy ───────────────────────── */

function RecordPurchaseModal({ item, accounts, staffParties, onClose, onDone }) {
  const [qty, setQty] = useState(item.standard_quantity || 1);
  const [unitPrice, setUnitPrice] = useState(item.estimated_unit_price || "");
  const [billNo, setBillNo] = useState("");
  const [date, setDate] = useState(today());
  const [mode, setMode] = useState("party");           // party (primary) | account
  const [partyId, setPartyId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const total = (Number(qty) || 0) * (Number(unitPrice) || 0);
  const selParty = staffParties.find((p) => String(p.id) === String(partyId));
  const partyBal = Number(selParty?.balance || 0);
  const shortBal = mode === "party" && selParty && partyBal < total;

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (total <= 0) return setError("Quantity × unit price must be greater than zero.");
    if (mode === "party" && !partyId) return setError("Pick the staff party whose advance covers this.");
    if (mode === "account" && !accountId) return setError("Pick the cash / bank account that paid.");
    setBusy(true);
    try {
      const res = await recordRoutinePurchase(item.id, {
        quantity: Number(qty),
        unit_price: Number(unitPrice) || 0,
        vendor_invoice_number: billNo.trim() || null,
        date,
        paid_from_party_id: mode === "party" ? Number(partyId) : null,
        paid_from_account_id: mode === "account" ? Number(accountId) : null,
      });
      onDone(res.data?.purchase_request);
    } catch (err) {
      setError(err.response?.data?.message || "Could not record this purchase.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-start gap-3 px-6 py-4 border-b border-gray-100 bg-teal-50/50">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-teal-100 text-teal-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-teal-700">Record routine purchase</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {item.item_name} · pre-authorised recurring buy — posts the books, fills stock, advances the cycle. No approval needed.
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col min-h-0 flex-1">
          <div className="px-6 py-5 space-y-4 overflow-y-auto">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2.5">{error}</div>}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Quantity *</label>
                <input type="number" min="0.01" step="0.01" value={qty} onChange={(e) => setQty(e.target.value)} required
                  className="w-full px-3 py-2.5 text-sm text-right font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
                <p className="text-[10px] text-gray-400 mt-1">{item.unit}</p>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Unit price *</label>
                <input type="number" min="0" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} required
                  className="w-full px-3 py-2.5 text-sm text-right font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Total</label>
                <div className="px-3 py-2.5 text-sm text-right font-mono font-bold text-teal-700 bg-teal-50 rounded-lg">{fmt(total)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Bill / invoice #</label>
                <input type="text" value={billNo} onChange={(e) => setBillNo(e.target.value)} maxLength={100}
                  placeholder="Vendor's receipt number"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Date</label>
                <DateField value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Paid via *</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setMode("party")}
                  className={`text-left border rounded-lg p-2.5 transition-colors ${mode === "party" ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-gray-200 text-gray-700 hover:border-teal-300"}`}>
                  <p className={`text-xs font-bold ${mode === "party" ? "text-white" : "text-gray-800"}`}>Staff advance</p>
                  <p className={`text-[10px] mt-0.5 ${mode === "party" ? "text-teal-100" : "text-gray-500"}`}>Settles their advance balance</p>
                </button>
                <button type="button" onClick={() => setMode("account")}
                  className={`text-left border rounded-lg p-2.5 transition-colors ${mode === "account" ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-gray-200 text-gray-700 hover:border-teal-300"}`}>
                  <p className={`text-xs font-bold ${mode === "account" ? "text-white" : "text-gray-800"}`}>Cash / bank</p>
                  <p className={`text-[10px] mt-0.5 ${mode === "account" ? "text-teal-100" : "text-gray-500"}`}>Paid directly from an account</p>
                </button>
              </div>
            </div>

            {mode === "party" && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Staff party *</label>
                {staffParties.length === 0 ? (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">No staff parties. Create one under Finance → Parties.</p>
                ) : (
                  <div className="max-h-40 overflow-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {staffParties.map((p) => {
                      const sel = String(partyId) === String(p.id);
                      const bal = Number(p.balance || 0);
                      return (
                        <button key={p.id} type="button" onClick={() => setPartyId(p.id)}
                          className={`w-full text-left px-3 py-2.5 flex items-center justify-between ${sel ? "bg-teal-50 ring-1 ring-inset ring-teal-200" : "hover:bg-gray-50"}`}>
                          <span className={`text-sm font-semibold ${sel ? "text-teal-800" : "text-gray-800"}`}>{p.full_name}</span>
                          <span className={`text-[11px] font-mono ${bal > 0 ? "text-emerald-700" : bal < 0 ? "text-amber-700" : "text-gray-400"}`}>
                            {bal > 0 ? `+${fmt(bal)} advance` : bal < 0 ? `${fmt(bal)} (owed)` : "settled"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {shortBal && (
                  <p className="text-[10px] text-amber-700 mt-1.5">⚠ Advance ({fmt(partyBal)}) is less than this purchase — their balance will go negative (school will owe them).</p>
                )}
              </div>
            )}

            {mode === "account" && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Cash / bank account *</label>
                {accounts.length === 0 ? (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">No accounts. Add one under Finance → Setup → Accounts.</p>
                ) : (
                  <div className="max-h-40 overflow-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {accounts.map((a) => {
                      const sel = String(accountId) === String(a.id);
                      return (
                        <button key={a.id} type="button" onClick={() => setAccountId(a.id)}
                          className={`w-full text-left px-3 py-2.5 flex items-center justify-between ${sel ? "bg-teal-50 ring-1 ring-inset ring-teal-200" : "hover:bg-gray-50"}`}>
                          <span className={`text-sm font-semibold ${sel ? "text-teal-800" : "text-gray-800"}`}>{a.account_name}</span>
                          <span className="text-[11px] text-gray-500 font-mono">{fmt(a.current_balance)} AFN</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button type="button" onClick={onClose} className="px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium">Cancel</button>
            <button type="submit" disabled={busy}
              className="px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-semibold disabled:opacity-50">
              {busy ? "Recording…" : `Confirm — ${fmt(total)} AFN`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent }) {
  return (
    <div className={`bg-gradient-to-r ${accent} rounded-xl p-3 text-white`}>
      <p className="text-[10px] uppercase tracking-wider opacity-80">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
