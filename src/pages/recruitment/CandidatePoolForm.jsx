import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";
import { handleValidationErrors } from "../../utils/formErrors";

const POOL_CATEGORIES = [
  { value: "", label: "Select Category" },
  { value: "teaching", label: "Teaching" },
  { value: "administration", label: "Administration" },
  { value: "finance", label: "Finance" },
  { value: "hr", label: "Human Resources" },
  { value: "it", label: "IT Support" },
  { value: "maintenance", label: "Maintenance" },
  { value: "other", label: "Other" },
];

export default function CandidatePoolForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    is_active: true,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) fetchPool();
  }, [id]);

  const fetchPool = async () => {
    setLoading(true);
    try {
      const response = await get(`/recruitment/candidate-pool/${id}`);
      const d = response.data?.data || response.data;
      setFormData({
        name: d.name || "",
        category: d.category || "",
        description: d.description || "",
        is_active: d.is_active ?? true,
      });
    } catch {
      Swal.fire("Error", "Failed to load pool data", "error");
      navigate("/recruitment/candidate-pool");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      if (isEdit) {
        await put(`/recruitment/candidate-pool/${id}`, formData);
        Swal.fire({ icon: "success", title: "Pool updated successfully", timer: 1500, showConfirmButton: false });
      } else {
        await post("/recruitment/candidate-pool", formData);
        Swal.fire({ icon: "success", title: "Pool created successfully", timer: 1500, showConfirmButton: false });
      }
      navigate("/recruitment/candidate-pool");
    } catch (error) {
      if (!handleValidationErrors(error.response, setErrors)) {
        Swal.fire("Error", error.response?.data?.message || "Failed to save candidate", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const err = (f) => errors[f]?.[0];
  const inputClass = (f) => {
    const base = "w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:outline-none text-xs transition-all";
    return `${base} ${err(f) ? "border-red-400 focus:ring-red-300 bg-red-50" : "border-gray-200 focus:ring-teal-400 hover:border-gray-300 bg-white"}`;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-100 border-t-teal-600"></div>
          <span className="text-gray-500 text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/recruitment/candidate-pool")}
          className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-bold text-gray-800">{isEdit ? "Edit Pool" : "Create Candidate Pool"}</h2>
          <p className="text-[11px] text-gray-400">{isEdit ? "Update pool details" : "Create a new talent pool for organizing candidates"}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-teal-100">
          <h3 className="text-sm font-bold text-gray-800">Pool Details</h3>
        </div>

        <div className="p-5 space-y-4">
          
          {/* Row for Name + Category */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Pool Name *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required
                placeholder="e.g. Math Teachers 2026, Admin Staff Reserve"
                className={inputClass("name")} />
              {err("name") && <p className="text-red-500 text-[10px] mt-1">{err("name")}</p>}
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Category *</label>
              <select name="category" value={formData.category} onChange={handleChange} required
                className={inputClass("category")}>
                {POOL_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              {err("category") && <p className="text-red-500 text-[10px] mt-1">{err("category")}</p>}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows={3}
              placeholder="Brief description of this pool's purpose..."
              className={inputClass("description")} />
          </div>

          {isEdit && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <input type="checkbox" id="is_active" name="is_active" checked={formData.is_active} onChange={handleChange}
                className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500" />
              <label htmlFor="is_active" className="text-xs font-medium text-gray-700">Pool is active and accepting candidates</label>
            </div>
          )}
        </div>

        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button type="button" onClick={() => navigate("/recruitment/candidate-pool")}
            className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-all">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2">
            {saving ? (
              <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Saving...</>
            ) : (
              <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{isEdit ? "Update Pool" : "Create Pool"}</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
