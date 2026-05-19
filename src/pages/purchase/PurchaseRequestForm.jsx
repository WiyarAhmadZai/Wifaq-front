import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPurchaseRequest } from "../../api/purchaseRequests";
import { getChartOfAccounts } from "../../api/financial";
import { get } from "../../api/axios";
import Swal from "sweetalert2";

import { DateField } from "../../components/hr/HrUI";
const PRIORITIES = [
  { value: "low",    label: "Low",    blurb: "Routine — can wait" },
  { value: "medium", label: "Medium", blurb: "Standard turnaround" },
  { value: "high",   label: "High",   blurb: "Urgent — same week" },
];

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => Number(n || 0).toLocaleString();

// Only Expense chart accounts are valid budget categories for a PR item.
// Leaves only (no parent / header rows).
const isExpenseLeaf = (c) =>
  c?.is_active !== false && c?.type === "Expense" && (c?.level ?? 1) >= 3;

const blankItem = () => ({
  item_name: "",
  description: "",
  quantity: 1,
  unit: "piece",
  estimated_unit_price: 0,
  chart_account_id: null,
  stock_id: null,         // optional — when set, completing the PR auto-increments this Stock row
});

export default function PurchaseRequestForm() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [requestDate, setRequestDate] = useState(today());
  const [priority, setPriority] = useState("medium");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([blankItem()]);

  const [chart, setChart] = useState([]);
  const [stockRows, setStockRows] = useState([]);

  useEffect(() => {
    getChartOfAccounts()
      .then((r) => setChart(r.data?.data || []))
      .catch(() => setChart([]));
    // Stock rows used by the optional "link to stock" picker on each item.
    // When set, completing this PR auto-increments the row's quantity.
    get("/purchase/stock")
      .then((r) => {
        const rows = r.data?.data?.data || r.data?.data || [];
        setStockRows(Array.isArray(rows) ? rows : []);
      })
      .catch(() => setStockRows([]));
  }, []);

  const expenseAccounts = useMemo(
    () => (chart || []).filter(isExpenseLeaf).sort((a, b) => String(a.code).localeCompare(String(b.code))),
    [chart]
  );

  const total = useMemo(
    () => items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.estimated_unit_price) || 0), 0),
    [items]
  );

  const updateItem = (i, patch) => setItems((arr) => arr.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const addItem    = () => setItems((arr) => [...arr, blankItem()]);
  const removeItem = (i) => setItems((arr) => arr.length === 1 ? arr : arr.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!purpose.trim()) {
      Swal.fire("Add a purpose", "Tell finance what this request is for.", "warning");
      return;
    }
    const cleanItems = items
      .map((it) => ({
        ...it,
        quantity: Number(it.quantity) || 0,
        estimated_unit_price: Number(it.estimated_unit_price) || 0,
        stock_id: it.stock_id ? Number(it.stock_id) : null,
      }))
      .filter((it) => it.item_name.trim() && it.quantity > 0);

    if (cleanItems.length === 0) {
      Swal.fire("Add at least one item", "A purchase request needs at least one line item.", "warning");
      return;
    }

    setSubmitting(true);
    try {
      await createPurchaseRequest({
        request_date: requestDate,
        priority,
        purpose,
        notes: notes || null,
        items: cleanItems,
      });
      Swal.fire({
        toast: true, position: "top-end", icon: "success",
        title: "Draft created", timer: 1500, showConfirmButton: false,
      });
      navigate("/purchase/purchase-requests");
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Could not create request.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 py-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate("/purchase/purchase-requests")}
          className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-base font-bold text-gray-800">New Purchase Request</h2>
          <p className="text-[11px] text-gray-500">Save as draft, then submit when ready.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Request Date *</label>
              <DateField value={requestDate} onChange={(e) => setRequestDate(e.target.value)} required
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Purpose *</label>
              <input type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} required maxLength={255}
                placeholder="Office tools for Q2 — Ahmad bazar run"
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Priority *</label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITIES.map((p) => (
                <button key={p.value} type="button" onClick={() => setPriority(p.value)}
                  className={`text-left border rounded-lg p-2.5 transition-colors ${
                    priority === p.value
                      ? "bg-teal-600 border-teal-600 text-white"
                      : "bg-white border-gray-200 text-gray-700 hover:border-teal-300"
                  }`}>
                  <p className={`text-xs font-bold ${priority === p.value ? "text-white" : "text-gray-800"}`}>{p.label}</p>
                  <p className={`text-[10px] ${priority === p.value ? "text-teal-100" : "text-gray-500"}`}>{p.blurb}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Optional context for the approver"
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
          </div>
        </div>

        {/* Line items */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-800">Items</h3>
              <p className="text-[10px] text-gray-500">Each item gets its own quantity, unit, and expense category.</p>
            </div>
            <button type="button" onClick={addItem}
              className="px-2.5 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-[10px] font-semibold flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-gray-50 text-gray-500 uppercase text-[9px]">
                <tr>
                  <th className="text-left px-2 py-1.5">Item *</th>
                  <th className="text-left px-2 py-1.5">Description</th>
                  <th className="text-right px-2 py-1.5">Qty *</th>
                  <th className="text-left px-2 py-1.5">Unit</th>
                  <th className="text-right px-2 py-1.5">Unit price *</th>
                  <th className="text-left px-2 py-1.5">Category</th>
                  <th className="text-left px-2 py-1.5" title="Optional — completing the PR auto-increments this stock row">Stock</th>
                  <th className="text-right px-2 py-1.5">Total</th>
                  <th className="text-center px-2 py-1.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((it, i) => {
                  const lineTotal = (Number(it.quantity) || 0) * (Number(it.estimated_unit_price) || 0);
                  return (
                    <tr key={i}>
                      <td className="px-2 py-1.5">
                        <input type="text" value={it.item_name} onChange={(e) => updateItem(i, { item_name: e.target.value })}
                          placeholder="e.g. A4 paper ream"
                          className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-teal-500" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="text" value={it.description || ""} onChange={(e) => updateItem(i, { description: e.target.value })}
                          placeholder="Optional"
                          className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-teal-500" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" step="0.01" min="0.01" value={it.quantity}
                          onChange={(e) => updateItem(i, { quantity: e.target.value })}
                          className="w-20 px-2 py-1 text-xs text-right border border-gray-200 rounded focus:outline-none focus:border-teal-500" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="text" value={it.unit} onChange={(e) => updateItem(i, { unit: e.target.value })}
                          className="w-20 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-teal-500" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" step="0.01" min="0" value={it.estimated_unit_price}
                          onChange={(e) => updateItem(i, { estimated_unit_price: e.target.value })}
                          className="w-24 px-2 py-1 text-xs text-right border border-gray-200 rounded focus:outline-none focus:border-teal-500" />
                      </td>
                      <td className="px-2 py-1.5">
                        <select value={it.chart_account_id || ""}
                          onChange={(e) => updateItem(i, { chart_account_id: e.target.value || null })}
                          className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-teal-500">
                          <option value="">— pick category —</option>
                          {expenseAccounts.map((c) => (
                            <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <select value={it.stock_id || ""}
                          onChange={(e) => updateItem(i, { stock_id: e.target.value || null })}
                          className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-teal-500">
                          <option value="">— not stocked —</option>
                          {stockRows.map((s) => (
                            <option key={s.id} value={s.id}>{s.item_name} ({s.quantity} {s.unit})</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5 text-right font-semibold text-gray-800 whitespace-nowrap">{fmt(lineTotal)}</td>
                      <td className="px-2 py-1.5 text-center">
                        {items.length > 1 && (
                          <button type="button" onClick={() => removeItem(i)} className="text-red-500 hover:text-red-700">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td colSpan={7} className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500 uppercase">Estimated total</td>
                  <td className="px-2 py-2 text-right text-sm font-bold text-teal-700">{fmt(total)} <span className="text-[10px] font-normal">AFN</span></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={submitting}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-semibold disabled:opacity-50">
            {submitting ? "Saving…" : "Save as draft"}
          </button>
          <button type="button" onClick={() => navigate("/purchase/purchase-requests")}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-xs font-medium">
            Cancel
          </button>
          <p className="text-[10px] text-gray-400 self-center ml-2">After saving, you can submit it for approval from the request detail page.</p>
        </div>
      </form>
    </div>
  );
}
