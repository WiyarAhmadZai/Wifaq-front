import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listStock, deleteStock,
  issueStock, adjustStock, getStockMovements,
} from "../../api/stock";
import Swal from "sweetalert2";

const fmt = (n) => Number(n || 0).toLocaleString();
const today = () => new Date().toISOString().slice(0, 10);

// stock_state comes from the backend accessor: ok | low | out
const STATE = {
  ok:  { label: "In stock", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  low: { label: "Low",      cls: "bg-amber-50 text-amber-700 border-amber-200" },
  out: { label: "Out",      cls: "bg-red-50 text-red-700 border-red-200" },
};

const MOVE_META = {
  opening:     { label: "Opening",   cls: "bg-gray-100 text-gray-600 border-gray-200" },
  purchase_in: { label: "Purchase",  cls: "bg-blue-50 text-blue-700 border-blue-200" },
  issue_out:   { label: "Issued",    cls: "bg-red-50 text-red-700 border-red-200" },
  adjustment:  { label: "Adjusted",  cls: "bg-amber-50 text-amber-700 border-amber-200" },
};

export default function Stock() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");      // all | low | out
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);          // { kind:'issue'|'adjust'|'history', stock }

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const r = await listStock();
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
      title: "Delete stock item?",
      text: "Its movement history goes with it.",
      icon: "warning", showCancelButton: true,
      confirmButtonColor: "#ef4444", confirmButtonText: "Delete",
    });
    if (!r.isConfirmed) return;
    try {
      await deleteStock(id);
      setItems((p) => p.filter((i) => i.id !== id));
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to delete", "error");
    }
  };

  const filtered = useMemo(() => {
    let rows = items;
    if (filter !== "all") rows = rows.filter((i) => i.stock_state === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((i) =>
        [i.item_name, i.category, i.location].some((f) => String(f || "").toLowerCase().includes(q)));
    }
    return rows;
  }, [items, filter, search]);

  const stats = useMemo(() => {
    const s = { total: items.length, low: 0, out: 0, value: 0 };
    items.forEach((i) => {
      if (i.stock_state === "low") s.low++;
      if (i.stock_state === "out") s.out++;
      s.value += (Number(i.quantity) || 0) * (Number(i.unit_price) || 0);
    });
    return s;
  }, [items]);

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Stock / Inventory</h2>
          <p className="text-xs text-gray-500">On-hand quantities. Goods in from purchases, out as they're issued — every change is logged.</p>
        </div>
        <button onClick={() => navigate("/purchase/stock/create")}
          className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New item
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <SummaryCard label="Items" value={stats.total} accent="from-teal-600 to-teal-700" />
        <SummaryCard label="Low stock" value={stats.low} accent={stats.low ? "from-amber-500 to-amber-600" : "from-gray-500 to-gray-600"} />
        <SummaryCard label="Out of stock" value={stats.out} accent={stats.out ? "from-red-500 to-red-600" : "from-gray-500 to-gray-600"} />
        <SummaryCard label="Stock value (AFN)" value={fmt(stats.value)} accent="from-gray-700 to-gray-800" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1.5">
          {["all", "low", "out"].map((t) => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold capitalize transition-colors ${
                filter === t ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>{t}</button>
          ))}
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search item, category, location…"
          className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-[11px]">
          <thead className="bg-gray-50 text-gray-500 uppercase text-[9px]">
            <tr>
              <th className="text-left px-3 py-2">Item</th>
              <th className="text-left px-3 py-2">Category</th>
              <th className="text-right px-3 py-2">On hand</th>
              <th className="text-right px-3 py-2">Min</th>
              <th className="text-right px-3 py-2">Unit price</th>
              <th className="text-center px-3 py-2">State</th>
              <th className="text-center px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-xs text-gray-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-xs text-gray-400 italic">No stock items.</td></tr>
            ) : filtered.map((s) => {
              const st = STATE[s.stock_state] || STATE.ok;
              return (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-800">{s.item_name}</td>
                  <td className="px-3 py-2 text-gray-500">{s.category}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-gray-800">{fmt(s.quantity)} <span className="text-[10px] font-normal text-gray-400">{s.unit}</span></td>
                  <td className="px-3 py-2 text-right text-gray-400 font-mono">{s.min_stock_level || "—"}</td>
                  <td className="px-3 py-2 text-right text-gray-600 font-mono">{s.unit_price ? fmt(s.unit_price) : "—"}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${st.cls}`}>{st.label}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => setModal({ kind: "issue", stock: s })}
                        className="px-2 py-1 text-[10px] font-semibold text-red-700 bg-red-50 rounded hover:bg-red-100">Issue</button>
                      <button onClick={() => setModal({ kind: "adjust", stock: s })}
                        className="px-2 py-1 text-[10px] font-semibold text-amber-700 bg-amber-50 rounded hover:bg-amber-100">Adjust</button>
                      <button onClick={() => setModal({ kind: "history", stock: s })}
                        className="px-2 py-1 text-[10px] font-semibold text-gray-600 bg-gray-100 rounded hover:bg-gray-200">History</button>
                      <button onClick={() => navigate(`/purchase/stock/edit/${s.id}`)}
                        className="px-2 py-1 text-[10px] font-semibold text-teal-600 bg-teal-50 rounded hover:bg-teal-100">Edit</button>
                      <button onClick={() => handleDelete(s.id)}
                        className="px-2 py-1 text-[10px] font-semibold text-gray-400 hover:text-red-600">✕</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal?.kind === "issue" && (
        <MovementModal kind="issue" stock={modal.stock}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); fetchItems(); }} />
      )}
      {modal?.kind === "adjust" && (
        <MovementModal kind="adjust" stock={modal.stock}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); fetchItems(); }} />
      )}
      {modal?.kind === "history" && (
        <HistoryDrawer stock={modal.stock} onClose={() => setModal(null)} />
      )}
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

/* ── Issue / Adjust modal ───────────────────────────────────────────────── */

function MovementModal({ kind, stock, onClose, onDone }) {
  const isIssue = kind === "issue";
  const [qty, setQty] = useState("");
  const [delta, setDelta] = useState("");          // adjust mode: signed
  const [issuedTo, setIssuedTo] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const onHand = Number(stock.quantity) || 0;
  const issueQty = Number(qty) || 0;
  const adjDelta = Number(delta) || 0;
  const projected = isIssue ? onHand - issueQty : onHand + adjDelta;

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (isIssue) {
      if (issueQty <= 0) return setError("Enter a quantity to issue.");
      if (issueQty > onHand) return setError(`Only ${onHand} ${stock.unit} on hand — can't issue ${issueQty}.`);
    } else {
      if (adjDelta === 0) return setError("Enter a non-zero adjustment (use − to remove).");
      if (onHand + adjDelta < 0) return setError(`Adjustment would make stock negative (${onHand} on hand).`);
    }
    setBusy(true);
    try {
      if (isIssue) {
        await issueStock(stock.id, { quantity: issueQty, issued_to: issuedTo || null, reason: reason || null, note: note || null, date });
      } else {
        await adjustStock(stock.id, { delta: adjDelta, reason: reason || null, note: note || null, date });
      }
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: isIssue ? "Stock issued" : "Stock adjusted", timer: 1400, showConfirmButton: false });
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || "Server rejected this movement.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <div className={`flex items-start gap-3 px-6 py-4 border-b border-gray-100 ${isIssue ? "bg-red-50/50" : "bg-amber-50/50"}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isIssue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
            <span className="text-lg font-bold">{isIssue ? "↓" : "⚙"}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-base font-bold ${isIssue ? "text-red-700" : "text-amber-700"}`}>
              {isIssue ? "Issue stock" : "Adjust stock"}
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {stock.item_name} · <span className="font-semibold">{fmt(onHand)} {stock.unit}</span> on hand
            </p>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col min-h-0 flex-1">
          <div className="px-6 py-5 space-y-4 overflow-y-auto">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2.5">{error}</div>}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                  {isIssue ? "Quantity to issue *" : "Adjustment (+/−) *"}
                </label>
                <input type="number" step="1" autoFocus required
                  value={isIssue ? qty : delta}
                  onChange={(e) => isIssue ? setQty(e.target.value) : setDelta(e.target.value)}
                  placeholder={isIssue ? "0" : "e.g. -3 or 5"}
                  className="w-full px-3 py-2.5 text-sm text-right font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
              </div>
            </div>

            <div className={`text-xs rounded-lg px-3 py-2 ${projected < 0 ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-600"}`}>
              On hand after this: <strong className="font-mono">{fmt(projected)} {stock.unit}</strong>
            </div>

            {isIssue && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Issued to <span className="font-normal text-gray-400">(department / person)</span></label>
                <input type="text" value={issuedTo} onChange={(e) => setIssuedTo(e.target.value)}
                  placeholder="e.g. Science department, Ahmad"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Reason {isIssue ? <span className="font-normal text-gray-400">(optional)</span> : "*"}</label>
              <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder={isIssue ? "What's it being used for?" : "Why is the count being corrected?"}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Note <span className="font-normal text-gray-400">(optional)</span></label>
              <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button type="button" onClick={onClose} className="px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium">Cancel</button>
            <button type="submit" disabled={busy}
              className={`px-5 py-2.5 text-white rounded-lg text-sm font-semibold disabled:opacity-50 ${isIssue ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}`}>
              {busy ? "Saving…" : isIssue ? "Confirm issue" : "Confirm adjustment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Movements history drawer ───────────────────────────────────────────── */

function HistoryDrawer({ stock, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStockMovements(stock.id)
      .then((r) => setRows(r.data?.data?.movements || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [stock.id]);

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-800">{stock.item_name} — movement history</h3>
            <p className="text-[11px] text-gray-500">Every in / out, newest first · {fmt(stock.quantity)} {stock.unit} on hand now</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto">
          {loading ? (
            <p className="text-center py-8 text-xs text-gray-400">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-center py-8 text-xs text-gray-400 italic">No movements yet.</p>
          ) : (
            <table className="w-full text-[11px]">
              <thead className="bg-gray-50 text-gray-500 uppercase text-[9px] sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">Type</th>
                  <th className="text-right px-4 py-2">In</th>
                  <th className="text-right px-4 py-2">Out</th>
                  <th className="text-right px-4 py-2">Balance</th>
                  <th className="text-left px-4 py-2">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((m) => {
                  const meta = MOVE_META[m.type] || MOVE_META.adjustment;
                  return (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{m.movement_date}</td>
                      <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.cls}`}>{meta.label}</span></td>
                      <td className="px-4 py-2 text-right font-mono text-emerald-700">{m.direction === "in" ? fmt(m.quantity) : ""}</td>
                      <td className="px-4 py-2 text-right font-mono text-red-700">{m.direction === "out" ? fmt(m.quantity) : ""}</td>
                      <td className="px-4 py-2 text-right font-mono font-semibold text-gray-800">{fmt(m.balance_after)}</td>
                      <td className="px-4 py-2 text-gray-500">
                        {m.issued_to && <span>→ {m.issued_to} </span>}
                        {m.reason && <span className="text-gray-400">· {m.reason}</span>}
                        {m.reference_type === "purchase_request" && <span className="text-gray-400">· PR #{m.reference_id}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
