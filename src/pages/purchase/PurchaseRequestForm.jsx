import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";

const emptyItem = { item_name: "", quantity: 1, unit: "pcs", unit_price: "", notes: "" };

export default function PurchaseRequestForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    requested_by: "",
    department: "",
    priority: "medium",
    project_id: "",
    notes: "",
  });

  const [items, setItems] = useState([{ ...emptyItem }]);

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      get(`/purchase/purchase-requests/${id}`)
        .then((res) => {
          const data = res.data;
          setForm({
            title: data.title || "",
            requested_by: data.requested_by || "",
            department: data.department || "",
            priority: data.priority || "medium",
            project_id: data.project_id || "",
            notes: data.notes || "",
          });
          if (data.items?.length) setItems(data.items);
        })
        .catch(() => Swal.fire("Error", "Failed to load data", "error"))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleFormChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addItem = () => setItems((prev) => [...prev, { ...emptyItem }]);

  const removeItem = (index) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const getLineTotal = (item) => (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
  const grandTotal = items.reduce((sum, item) => sum + getLineTotal(item), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!items.some((i) => i.item_name.trim())) {
      Swal.fire("Validation", "Add at least one item", "warning");
      return;
    }
    setSaving(true);
    const payload = { ...form, items, total_amount: grandTotal };
    try {
      if (isEdit) {
        await put(`/purchase/purchase-requests/${id}`, payload);
        Swal.fire("Success", "Purchase request updated", "success");
      } else {
        await post("/purchase/purchase-requests", payload);
        Swal.fire("Success", "Purchase request created", "success");
      }
      navigate("/purchase/purchase-requests");
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-800">
            {isEdit ? "Edit Purchase Request" : "New Purchase Request"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Request Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-3">Request Details</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                <input type="text" name="title" value={form.title} onChange={handleFormChange} required
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Requested By <span className="text-red-500">*</span></label>
                <input type="text" name="requested_by" value={form.requested_by} onChange={handleFormChange} required
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Department <span className="text-red-500">*</span></label>
                <select name="department" value={form.department} onChange={handleFormChange} required
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs">
                  <option value="">Select Department</option>
                  <option value="Admin">Admin</option>
                  <option value="IT">IT</option>
                  <option value="HR">HR</option>
                  <option value="Finance">Finance</option>
                  <option value="Library">Library</option>
                  <option value="Science">Science</option>
                  <option value="Sports">Sports</option>
                  <option value="Facilities">Facilities</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                <select name="priority" value={form.priority} onChange={handleFormChange}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <input type="text" name="notes" value={form.notes} onChange={handleFormChange}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs"
                  placeholder="Any special instructions..." />
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-teal-600 uppercase tracking-wide">Request Items</h3>
              <button type="button" onClick={addItem}
                className="px-2.5 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-[10px] font-medium flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-[10px] font-semibold text-gray-600 uppercase pb-2 w-8">#</th>
                    <th className="text-left text-[10px] font-semibold text-gray-600 uppercase pb-2">Item Name</th>
                    <th className="text-left text-[10px] font-semibold text-gray-600 uppercase pb-2 w-20">Qty</th>
                    <th className="text-left text-[10px] font-semibold text-gray-600 uppercase pb-2 w-20">Unit</th>
                    <th className="text-left text-[10px] font-semibold text-gray-600 uppercase pb-2 w-28">Unit Price</th>
                    <th className="text-right text-[10px] font-semibold text-gray-600 uppercase pb-2 w-28">Total</th>
                    <th className="text-right text-[10px] font-semibold text-gray-600 uppercase pb-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 text-xs text-gray-400">{index + 1}</td>
                      <td className="py-2 pr-2">
                        <input type="text" value={item.item_name} onChange={(e) => handleItemChange(index, "item_name", e.target.value)}
                          placeholder="Enter item name" required
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-teal-500" />
                      </td>
                      <td className="py-2 pr-2">
                        <input type="number" min="1" value={item.quantity} onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-teal-500" />
                      </td>
                      <td className="py-2 pr-2">
                        <select value={item.unit} onChange={(e) => handleItemChange(index, "unit", e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-teal-500">
                          <option value="pcs">pcs</option>
                          <option value="kg">kg</option>
                          <option value="box">box</option>
                          <option value="set">set</option>
                          <option value="litre">litre</option>
                          <option value="meter">meter</option>
                          <option value="pack">pack</option>
                          <option value="ream">ream</option>
                        </select>
                      </td>
                      <td className="py-2 pr-2">
                        <input type="number" min="0" value={item.unit_price} onChange={(e) => handleItemChange(index, "unit_price", e.target.value)}
                          placeholder="0" className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-teal-500" />
                      </td>
                      <td className="py-2 text-right text-xs font-medium text-gray-800">{getLineTotal(item).toLocaleString()} AFN</td>
                      <td className="py-2 text-right">
                        {items.length > 1 && (
                          <button type="button" onClick={() => removeItem(index)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300">
                    <td colSpan={5} className="py-2 text-right text-xs font-semibold text-gray-700">Grand Total:</td>
                    <td className="py-2 text-right text-sm font-bold text-teal-700">{grandTotal.toLocaleString()} AFN</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button type="submit" disabled={saving}
              className="w-full sm:w-auto px-4 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium text-xs">
              {saving ? "Saving..." : isEdit ? "Update" : "Create Request"}
            </button>
            <button type="button" onClick={() => navigate("/purchase/purchase-requests")}
              className="w-full sm:w-auto px-4 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-xs">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
