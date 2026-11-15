import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getBudget, createBudget as post, updateBudget as put, getChartOfAccounts } from "../../api/financial";
import Swal from "sweetalert2";

import { DateField } from "../../components/hr/HrUI";
const emptyItem = { chart_account_id: "", budgeted_amount: "", alert_threshold: 80, notes: "" };

export default function BudgetForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [budgetStatus, setBudgetStatus] = useState("draft");
  const [form, setForm] = useState({
    name: "",
    budget_type: "annual",
    year: new Date().getFullYear(),
    start_date: `${new Date().getFullYear()}-01-01`,
    end_date: `${new Date().getFullYear()}-12-31`,
  });
  const [items, setItems] = useState([{ ...emptyItem }]);

  useEffect(() => {
    getChartOfAccounts({}).then((r) => {
      const list = r.data?.data?.data || r.data?.data || [];
      setAccounts(list.filter((a) => a.type === "Expense" && a.is_active));
    }).catch(() => {
      setAccounts([]);
    });

    if (isEdit) {
      getBudget(id)
        .then((r) => {
          const d = r.data?.data || r.data;
          if (d) {
            setBudgetStatus(d.status || "draft");
            setForm({
              name: d.name || "",
              budget_type: d.budget_type || "annual",
              year: d.year || new Date().getFullYear(),
              start_date: d.start_date || `${new Date().getFullYear()}-01-01`,
              end_date: d.end_date || `${new Date().getFullYear()}-12-31`,
            });

            if (d.items?.length) {
              setItems(d.items.map((it) => ({
                chart_account_id: it.chart_account_id || "",
                budgeted_amount: it.budgeted_amount ?? "",
                alert_threshold: it.alert_threshold ?? 80,
                notes: it.notes ?? "",
              })));
            }
          }
        })
        .catch(() => {});
    }
  }, [id]);

  const handleFormChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleItemChange = (i, f, v) => setItems((p) => p.map((item, idx) => idx === i ? { ...item, [f]: v } : item));
  const addItem = () => setItems((p) => [...p, { ...emptyItem }]);
  const removeItem = (i) => { if (items.length > 1) setItems((p) => p.filter((_, idx) => idx !== i)); };

  const totalBudget = items.reduce((s, i) => s + (Number(i.budgeted_amount) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      year: Number(form.year),
      items: items.map((it) => ({
        chart_account_id: Number(it.chart_account_id),
        budgeted_amount: Number(it.budgeted_amount) || 0,
        alert_threshold: it.alert_threshold === "" || it.alert_threshold === null ? 80 : Number(it.alert_threshold),
        notes: it.notes || null,
      })),
    };
    try {
      if (isEdit) { await put(id, payload); Swal.fire("Updated!", "Budget updated.", "success"); }
      else { await post(payload); Swal.fire("Created!", "Budget created.", "success"); }
      navigate("/finance/budgets");
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to save", "error");
    } finally { setSaving(false); }
  };

  const isReadOnly = isEdit && budgetStatus !== "draft";

  return (
    <div className="w-full px-4 py-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">{isEdit ? "Edit Budget" : "Create Budget"}</h2>
          {isEdit && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
              budgetStatus === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
              budgetStatus === "closed" ? "bg-gray-100 text-gray-600 border-gray-300" :
              "bg-amber-50 text-amber-700 border-amber-200"
            }`}>
              {budgetStatus === "active" ? "Active (current)" : budgetStatus}
            </span>
          )}
        </div>
        {isReadOnly && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 text-[10px] text-amber-700">
            This budget is <strong>{budgetStatus}</strong> and cannot be edited. Only draft budgets can be modified.
          </div>
        )}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Header */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-3">Budget Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Budget Name <span className="text-red-500">*</span></label>
                <input type="text" name="name" value={form.name} onChange={handleFormChange} required disabled={isReadOnly}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="e.g. Annual Budget 2026" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Budget Type</label>
                <select name="budget_type" value={form.budget_type} onChange={handleFormChange} disabled={isReadOnly}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-500">
                  <option value="annual">Annual</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="monthly">Monthly</option>
                  <option value="project">Project</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
                <input type="number" name="year" value={form.year} onChange={handleFormChange} disabled={isReadOnly}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <DateField name="start_date" value={form.start_date} onChange={handleFormChange} disabled={isReadOnly}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                <DateField name="end_date" value={form.end_date} onChange={handleFormChange} disabled={isReadOnly}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-500" />
              </div>
            </div>
          </div>

          {/* Budget Items */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-teal-600 uppercase tracking-wide">Budget Categories</h3>
              {!isReadOnly && (
                <button type="button" onClick={addItem}
                  className="px-2.5 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-[10px] font-medium flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add Category
              </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-[10px] font-semibold text-gray-600 uppercase pb-2">#</th>
                    <th className="text-left text-[10px] font-semibold text-gray-600 uppercase pb-2">Account</th>
                    <th className="text-left text-[10px] font-semibold text-gray-600 uppercase pb-2 w-36">Budget (AFN)</th>
                    <th className="text-left text-[10px] font-semibold text-gray-600 uppercase pb-2 w-28">Alert %</th>
                    <th className="text-left text-[10px] font-semibold text-gray-600 uppercase pb-2">Notes</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 text-xs text-gray-400">{i + 1}</td>
                      <td className="py-2 pr-2">
                        <select value={item.chart_account_id} onChange={(e) => handleItemChange(i, "chart_account_id", e.target.value)} required disabled={isReadOnly}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-500">
                          <option value="">Select expense account</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-2">
                        <input type="number" value={item.budgeted_amount} onChange={(e) => handleItemChange(i, "budgeted_amount", e.target.value)}
                          placeholder="0" disabled={isReadOnly} className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-500" />
                      </td>
                      <td className="py-2 pr-2">
                        <input type="number" value={item.alert_threshold} onChange={(e) => handleItemChange(i, "alert_threshold", e.target.value)}
                          min="0" max="100" step="1" placeholder="80" disabled={isReadOnly}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-500" />
                      </td>
                      <td className="py-2 pr-2">
                        <input type="text" value={item.notes} onChange={(e) => handleItemChange(i, "notes", e.target.value)}
                          disabled={isReadOnly} className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-500" />
                      </td>
                      <td className="py-2">
                        {items.length > 1 && !isReadOnly && (
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
            {!isReadOnly && (
              <button type="submit" disabled={saving} className="px-4 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium text-xs">
                {saving ? "Saving..." : isEdit ? "Update" : "Create Budget"}
              </button>
            )}
            <button type="button" onClick={() => navigate("/finance/budgets")} className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-xs">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
