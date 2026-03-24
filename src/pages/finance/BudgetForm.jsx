import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";

const emptyItem = { category: "", budgeted: "", notes: "" };

export default function BudgetForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", year: new Date().getFullYear(), status: "draft" });
  const [items, setItems] = useState([{ ...emptyItem }]);

  useEffect(() => {
    if (isEdit) {
      get(`/finance/budgets/${id}`)
        .then((r) => {
          const d = r.data;
          setForm({ name: d.name || "", year: d.year || "", status: d.status || "draft" });
          if (d.items?.length) setItems(d.items);
        })
        .catch(() => {});
    }
  }, [id]);

  const handleFormChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleItemChange = (i, f, v) => setItems((p) => p.map((item, idx) => idx === i ? { ...item, [f]: v } : item));
  const addItem = () => setItems((p) => [...p, { ...emptyItem }]);
  const removeItem = (i) => { if (items.length > 1) setItems((p) => p.filter((_, idx) => idx !== i)); };

  const totalBudget = items.reduce((s, i) => s + (Number(i.budgeted) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, items, total_budget: totalBudget };
    try {
      if (isEdit) { await put(`/finance/budgets/${id}`, payload); Swal.fire("Updated!", "Budget updated.", "success"); }
      else { await post("/finance/budgets", payload); Swal.fire("Created!", "Budget created.", "success"); }
      navigate("/finance/budgets");
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to save", "error");
    } finally { setSaving(false); }
  };

  return (
    <div className="w-full px-4 py-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-800">{isEdit ? "Edit Budget" : "Create Budget"}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Header */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-3">Budget Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Budget Name <span className="text-red-500">*</span></label>
                <input type="text" name="name" value={form.name} onChange={handleFormChange} required
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g. Annual Budget 2026" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
                <input type="number" name="year" value={form.year} onChange={handleFormChange}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select name="status" value={form.status} onChange={handleFormChange}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500">
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Budget Items */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-teal-600 uppercase tracking-wide">Budget Categories</h3>
              <button type="button" onClick={addItem}
                className="px-2.5 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-[10px] font-medium flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add Category
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-[10px] font-semibold text-gray-600 uppercase pb-2">#</th>
                    <th className="text-left text-[10px] font-semibold text-gray-600 uppercase pb-2">Category</th>
                    <th className="text-left text-[10px] font-semibold text-gray-600 uppercase pb-2 w-36">Budget (AFN)</th>
                    <th className="text-left text-[10px] font-semibold text-gray-600 uppercase pb-2">Notes</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 text-xs text-gray-400">{i + 1}</td>
                      <td className="py-2 pr-2">
                        <select value={item.category} onChange={(e) => handleItemChange(i, "category", e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-teal-500">
                          <option value="">Select category</option>
                          {["Salaries", "Office Supplies", "Utilities", "Maintenance", "Transportation", "Training", "Events", "Printing", "IT Equipment", "Other"].map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-2">
                        <input type="number" value={item.budgeted} onChange={(e) => handleItemChange(i, "budgeted", e.target.value)}
                          placeholder="0" className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-teal-500" />
                      </td>
                      <td className="py-2 pr-2">
                        <input type="text" value={item.notes} onChange={(e) => handleItemChange(i, "notes", e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-teal-500" />
                      </td>
                      <td className="py-2">
                        {items.length > 1 && (
                          <button type="button" onClick={() => removeItem(i)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300">
                    <td colSpan={2} className="py-2 text-right text-xs font-semibold text-gray-700">Total Budget:</td>
                    <td className="py-2 text-xs font-bold text-teal-700">{totalBudget.toLocaleString()} AFN</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium text-xs">
              {saving ? "Saving..." : isEdit ? "Update" : "Create Budget"}
            </button>
            <button type="button" onClick={() => navigate("/finance/budgets")} className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-xs">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
