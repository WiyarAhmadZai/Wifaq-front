import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createRoutineItem, getRoutineItem, updateRoutineItem } from "../../api/routineItems";
import { getChartOfAccounts } from "../../api/financial";
import { get } from "../../api/axios";
import Swal from "sweetalert2";

// Convenience presets — most schools deal in a handful of standard cycles.
// Custom values still work; the field is just a number input.
const FREQUENCY_PRESETS = [
  { label: "Weekly",     days: 7 },
  { label: "Bi-weekly",  days: 14 },
  { label: "Monthly",    days: 30 },
  { label: "Quarterly",  days: 90 },
  { label: "Semester",   days: 180 },
];

const isExpenseLeaf = (c) =>
  c?.is_active !== false && c?.type === "Expense" && (c?.level ?? 1) >= 3;

export default function RoutineItemForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  const [itemName, setItemName]                 = useState("");
  const [unit, setUnit]                         = useState("piece");
  const [standardQty, setStandardQty]           = useState(1);
  const [frequencyDays, setFrequencyDays]       = useState(30);
  const [estimatedUnitPrice, setEstimatedPrice] = useState("");
  const [stockId, setStockId]                   = useState("");
  const [chartAccountId, setChartAccountId]     = useState("");
  const [lastPurchaseDate, setLastPurchaseDate] = useState("");
  const [isActive, setIsActive]                 = useState(true);
  const [notes, setNotes]                       = useState("");

  const [chart, setChart] = useState([]);
  const [stockRows, setStockRows] = useState([]);

  useEffect(() => {
    // Load reference data: chart of accounts for category dropdown + stock
    // rows for the optional "link to stock" picker.
    getChartOfAccounts().then((r) => setChart(r.data?.data || [])).catch(() => setChart([]));
    get("/purchase/stock").then((r) => {
      const rows = r.data?.data?.data || r.data?.data || [];
      setStockRows(Array.isArray(rows) ? rows : []);
    }).catch(() => setStockRows([]));

    if (isEdit) {
      getRoutineItem(id)
        .then((r) => {
          const row = r.data?.data;
          if (!row) return;
          setItemName(row.item_name || "");
          setUnit(row.unit || "piece");
          setStandardQty(row.standard_quantity || 1);
          setFrequencyDays(row.frequency_days || 30);
          setEstimatedPrice(row.estimated_unit_price || "");
          setStockId(row.stock_id || "");
          setChartAccountId(row.chart_account_id || "");
          setLastPurchaseDate(row.last_purchase_date || "");
          setIsActive(row.is_active ?? true);
          setNotes(row.notes || "");
        })
        .catch(() => Swal.fire("Error", "Could not load this routine item.", "error"))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const expenseAccounts = useMemo(
    () => (chart || []).filter(isExpenseLeaf).sort((a, b) => String(a.code).localeCompare(String(b.code))),
    [chart]
  );

  const submit = async (e) => {
    e.preventDefault();
    if (!itemName.trim()) {
      Swal.fire("Item name required", "Tell the system what to reorder.", "warning");
      return;
    }
    setSubmitting(true);
    const payload = {
      item_name: itemName,
      unit,
      standard_quantity: Number(standardQty) || 0,
      frequency_days: Number(frequencyDays) || 0,
      estimated_unit_price: estimatedUnitPrice === "" ? null : Number(estimatedUnitPrice),
      stock_id: stockId || null,
      chart_account_id: chartAccountId || null,
      last_purchase_date: lastPurchaseDate || null,
      is_active: isActive,
      notes: notes || null,
    };
    try {
      if (isEdit) {
        await updateRoutineItem(id, payload);
      } else {
        await createRoutineItem(payload);
      }
      Swal.fire({
        toast: true, position: "top-end", icon: "success",
        title: isEdit ? "Updated" : "Created", timer: 1500, showConfirmButton: false,
      });
      navigate("/purchase/routine-items");
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Could not save.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="px-4 py-8 text-center text-xs text-gray-400">Loading…</p>;
  }

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate("/purchase/routine-items")}
          className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-base font-bold text-gray-800">
            {isEdit ? "Edit Routine Item" : "New Routine Item"}
          </h2>
          <p className="text-[11px] text-gray-500">
            Reordered automatically by the daily scan when its cycle is due.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Item name *</label>
              <input value={itemName} onChange={(e) => setItemName(e.target.value)} required maxLength={200}
                placeholder="A4 paper ream, 5kg gas cylinder, …"
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Standard quantity *</label>
              <input type="number" min="0.01" step="0.01" value={standardQty}
                onChange={(e) => setStandardQty(e.target.value)} required
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Unit</label>
              <input value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={50}
                placeholder="piece, pack, kg, …"
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Estimated unit price (AFN)</label>
              <input type="number" min="0" step="0.01" value={estimatedUnitPrice}
                onChange={(e) => setEstimatedPrice(e.target.value)} placeholder="Optional — used on the auto-generated PR"
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input id="ri-active" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500" />
              <label htmlFor="ri-active" className="text-xs text-gray-700 select-none">Active — auto-generate purchase requests for this item</label>
            </div>
          </div>
        </div>

        {/* Cycle */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-1">Purchase cycle</h3>
          <p className="text-[10px] text-gray-500 mb-3">How often this item gets reordered. The next due date is calculated automatically from the last purchase date + frequency.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Frequency (days) *</label>
              <input type="number" min="1" value={frequencyDays}
                onChange={(e) => setFrequencyDays(e.target.value)} required
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {FREQUENCY_PRESETS.map((p) => (
                  <button key={p.days} type="button" onClick={() => setFrequencyDays(p.days)}
                    className={`px-2 py-0.5 rounded-full text-[10px] border transition-colors ${
                      Number(frequencyDays) === p.days
                        ? "bg-teal-600 text-white border-teal-600"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    }`}>{p.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Last purchase date</label>
              <input type="date" value={lastPurchaseDate} onChange={(e) => setLastPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
              <p className="text-[10px] text-gray-400 mt-1">Leave empty → reorder immediately on next scan.</p>
            </div>
          </div>
        </div>

        {/* Optional links */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-1">Links (optional)</h3>
          <p className="text-[10px] text-gray-500 mb-3">Tie this routine to a Stock row for low-stock detection, and to a Chart of Accounts category so the auto-generated PR is already classified for budget tracking.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Stock row</label>
              <select value={stockId} onChange={(e) => setStockId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500">
                <option value="">— not linked —</option>
                {stockRows.map((s) => (
                  <option key={s.id} value={s.id}>{s.item_name} ({s.quantity} {s.unit} on hand)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Expense category</label>
              <select value={chartAccountId} onChange={(e) => setChartAccountId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500">
                <option value="">— pick category —</option>
                {expenseAccounts.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Optional context (preferred vendor, brand spec, etc.)"
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
          </div>
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={submitting}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-semibold disabled:opacity-50">
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Create routine"}
          </button>
          <button type="button" onClick={() => navigate("/purchase/routine-items")}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-xs font-medium">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
