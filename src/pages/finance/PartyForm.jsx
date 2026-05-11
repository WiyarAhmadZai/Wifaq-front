import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createParty } from "../../api/financial";
import Swal from "sweetalert2";

const partyTypes = [
  { value: "student", label: "Student" },
  { value: "employee", label: "Employee" },
  { value: "supplier", label: "Supplier" },
  { value: "parent", label: "Parent" },
  { value: "teacher", label: "Teacher" },
  { value: "staff", label: "Staff" },
  { value: "other", label: "Other" },
];

export default function PartyForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    party_type: "student",
    full_name: "",
    phone: "",
    email: "",
    address: "",
    opening_balance: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        opening_balance: form.opening_balance ? parseFloat(form.opening_balance) : 0,
      };
      await createParty(payload);
      Swal.fire("Created!", "Party created successfully", "success");
      navigate("/finance/parties");
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "Failed to create party", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-4 max-w-xl">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate("/finance/parties")} className="text-gray-400 hover:text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-base font-bold text-gray-800">Add Party</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Party Type</label>
          <select name="party_type" value={form.party_type} onChange={handleChange}
            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500">
            {partyTypes.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Full Name *</label>
          <input type="text" name="full_name" value={form.full_name} onChange={handleChange} required
            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Phone</label>
            <input type="text" name="phone" value={form.phone} onChange={handleChange}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Address</label>
          <input type="text" name="address" value={form.address} onChange={handleChange}
            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Opening Balance</label>
          <input type="number" name="opening_balance" value={form.opening_balance} onChange={handleChange} min="0" step="0.01"
            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button type="submit" disabled={loading}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium disabled:opacity-50">
            {loading ? "Saving..." : "Save Party"}
          </button>
          <button type="button" onClick={() => navigate("/finance/parties")}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-xs font-medium">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
