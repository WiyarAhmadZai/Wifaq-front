import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";

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
    candidate_name: "",
    email: "",
    phone: "",
    pool_category: "",
    qualifications: "",
    experience_years: "",
    notes: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) fetchCandidate();
  }, [id]);

  const fetchCandidate = async () => {
    setLoading(true);
    try {
      const response = await get(`/recruitment/candidate-pool/${id}`);
      const d = response.data?.data || response.data;
      setFormData({
        candidate_name: d.candidate_name || "",
        email: d.email || "",
        phone: d.phone || "",
        pool_category: d.pool_category || "",
        qualifications: d.qualifications || "",
        experience_years: d.experience_years || "",
        notes: d.notes || "",
      });
    } catch (error) {
      Swal.fire("Error", "Failed to load candidate data", "error");
      navigate("/recruitment/candidate-pool");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      if (isEdit) {
        await put(`/recruitment/candidate-pool/${id}`, formData);
        Swal.fire("Success", "Candidate updated successfully", "success");
      } else {
        await post("/recruitment/candidate-pool", formData);
        Swal.fire("Success", "Candidate added to pool successfully", "success");
      }
      navigate("/recruitment/candidate-pool");
    } catch (error) {
      if (error.response?.status === 422 && error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
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
          <span className="text-gray-500 text-sm">Loading candidate data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/recruitment/candidate-pool")}
          className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-bold text-gray-800">
            {isEdit ? "Edit Candidate" : "Add Candidate to Pool"}
          </h2>
          <p className="text-[11px] text-gray-400">
            {isEdit ? "Update candidate information" : "Add a new candidate to the recruitment pool"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-teal-100">
          <h3 className="text-sm font-bold text-gray-800">Candidate Information</h3>
        </div>
        
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
              Candidate Name *
            </label>
            <input
              type="text"
              name="candidate_name"
              value={formData.candidate_name}
              onChange={handleChange}
              required
              placeholder="Full name"
              className={inputClass("candidate_name")}
            />
            {err("candidate_name") && <p className="text-red-500 text-[10px] mt-1">{err("candidate_name")}</p>}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="candidate@example.com"
              className={inputClass("email")}
            />
            {err("email") && <p className="text-red-500 text-[10px] mt-1">{err("email")}</p>}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
              Phone
            </label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+93 7xx xxx xxxx"
              className={inputClass("phone")}
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
              Pool Category *
            </label>
            <select
              name="pool_category"
              value={formData.pool_category}
              onChange={handleChange}
              required
              className={inputClass("pool_category")}
            >
              {POOL_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            {err("pool_category") && <p className="text-red-500 text-[10px] mt-1">{err("pool_category")}</p>}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
              Experience (Years)
            </label>
            <input
              type="number"
              name="experience_years"
              value={formData.experience_years}
              onChange={handleChange}
              placeholder="e.g. 5"
              min="0"
              className={inputClass("experience_years")}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
              Qualifications
            </label>
            <input
              type="text"
              name="qualifications"
              value={formData.qualifications}
              onChange={handleChange}
              placeholder="e.g. Bachelor's in Education, Teaching Certificate"
              className={inputClass("qualifications")}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Additional notes about the candidate..."
              className={inputClass("notes")}
            />
          </div>
        </div>

        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/recruitment/candidate-pool")}
            className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {isEdit ? "Update Candidate" : "Add to Pool"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
