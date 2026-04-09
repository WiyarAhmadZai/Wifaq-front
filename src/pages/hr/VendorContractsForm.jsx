import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";

const inp = "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none transition-colors placeholder-gray-400";

const CONTRACT_TYPES = [
  { value: "supply", label: "Supply" },
  { value: "service", label: "Service" },
  { value: "purchase", label: "Purchase" },
  { value: "rental", label: "Rental" },
  { value: "maintenance", label: "Maintenance" },
  { value: "consultancy", label: "Consultancy" },
  { value: "other", label: "Other" },
];

export default function VendorContractsForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    vendor_name: "",
    vendor_contact: "",
    vendor_email: "",
    vendor_address: "",
    contract_type: "supply",
    description: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    amount: "",
    currency: "AFN",
    payment_terms: "",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) fetchContract();
  }, [id]);

  const fetchContract = async () => {
    setLoading(true);
    try {
      const res = await get(`/hr/vendor-contracts/show/${id}`);
      const d = res.data;
      setForm({
        vendor_name: d.vendor_name || "",
        vendor_contact: d.vendor_contact || "",
        vendor_email: d.vendor_email || "",
        vendor_address: d.vendor_address || "",
        contract_type: d.contract_type || "supply",
        description: d.description || "",
        start_date: d.start_date?.split("T")[0] || "",
        end_date: d.end_date?.split("T")[0] || "",
        amount: d.amount || "",
        currency: d.currency || "AFN",
        payment_terms: d.payment_terms || "",
        notes: d.notes || "",
      });
    } catch {
      Swal.fire("Error", "Failed to load vendor contract", "error");
      navigate("/hr/vendor-contracts");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vendor_name || !form.start_date || !form.end_date || !form.amount) {
      Swal.fire("Error", "Please fill all required fields", "error");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await put(`/hr/vendor-contracts/update/${id}`, form);
        Swal.fire({ icon: "success", title: "Vendor contract updated", timer: 1500, showConfirmButton: false });
      } else {
        await post("/hr/vendor-contracts/store", form);
        Swal.fire({ icon: "success", title: "Vendor contract created", timer: 1500, showConfirmButton: false });
      }
      navigate("/hr/vendor-contracts");
    } catch (err) {
      const msg = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(", ")
        : err.response?.data?.message || "Failed to save vendor contract";
      Swal.fire("Error", msg, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="px-4 py-4 mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/hr/vendor-contracts")}
          className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-bold text-gray-800">{isEdit ? "Edit Vendor Contract" : "New Vendor Contract"}</h2>
          <p className="text-xs text-gray-500">{isEdit ? "Update vendor contract details" : "Create a contract with an external vendor or supplier"}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-5" autoComplete="off">
        {/* Vendor section */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Vendor Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Vendor Name *</label>
              <input type="text" name="vendor_name" value={form.vendor_name} onChange={handleChange} required
                placeholder="e.g. ABC Stationery Co." className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contact Number</label>
              <input type="text" name="vendor_contact" value={form.vendor_contact} onChange={handleChange}
                placeholder="+93 ..." className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input type="email" name="vendor_email" value={form.vendor_email} onChange={handleChange}
                placeholder="vendor@example.com" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
              <input type="text" name="vendor_address" value={form.vendor_address} onChange={handleChange}
                placeholder="City, district..." className={inp} />
            </div>
          </div>
        </div>

        {/* Contract section */}
        <div className="pt-4 border-t border-gray-100">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Contract Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contract Type *</label>
              <select name="contract_type" value={form.contract_type} onChange={handleChange} className={inp}>
                {CONTRACT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date *</label>
              <input type="date" name="start_date" value={form.start_date} onChange={handleChange} required className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date *</label>
              <input type="date" name="end_date" value={form.end_date} onChange={handleChange} required className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Amount *</label>
              <input type="number" step="0.01" min="0" name="amount" value={form.amount} onChange={handleChange} required
                placeholder="0.00" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
              <select name="currency" value={form.currency} onChange={handleChange} className={inp}>
                <option value="AFN">AFN</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3}
              placeholder="What is this contract for? (e.g. office furniture, monthly cleaning service, IT maintenance...)"
              className={inp} />
          </div>
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Payment Terms</label>
            <textarea name="payment_terms" value={form.payment_terms} onChange={handleChange} rows={2}
              placeholder="e.g. 50% advance, 50% on delivery..." className={inp} />
          </div>
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
              placeholder="Any additional notes..." className={inp} />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={() => navigate("/hr/vendor-contracts")}
            className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors text-sm font-medium">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="px-5 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2">
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> {isEdit ? "Update Contract" : "Create Contract"}</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
