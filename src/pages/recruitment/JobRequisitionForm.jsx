import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";

// Department options from backend enum
const DEPARTMENTS = [
  { value: "", label: "Select Department" },
  { value: "Finance", label: "Finance" },
  { value: "Human Resources", label: "Human Resources" },
  { value: "Academic", label: "Academic" },
  { value: "Administration", label: "Administration" },
  { value: "IT", label: "IT" },
  { value: "Operation", label: "Operation" },
  { value: "Science", label: "Science" },
  { value: "Languages", label: "Languages" },
];

const EMPLOYMENT_TYPES = [
  { value: "", label: "Select Employment Type" },
  { value: "full_time", label: "Full Time" },
  { value: "part_time", label: "Part Time" },
  { value: "contract", label: "Contract" },
  { value: "temporary", label: "Temporary" },
  { value: "internship", label: "Internship" },
];

const APPROVAL_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

export default function JobRequisitionForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    department: "",
    position_title: "",
    employment_type: "",
    number_of_positions: 1,
    justification: "",
    approval_status: "pending",
    approved_by: "",
    deadline_date: "",
  });

  const [staff, setStaff] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStaff();
    if (isEdit) fetchRequisition();
  }, [id]);

  const fetchStaff = async () => {
    try {
      const response = await get("/hr/staff/list");
      const data = response.data?.data || response.data || [];
      setStaff(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch staff", error);
    }
  };

  const fetchRequisition = async () => {
    setLoading(true);
    try {
      const response = await get(`/recruitment/job-requisitions/${id}`);
      const d = response.data?.data || response.data;
      
      // Format date to YYYY-MM-DD for HTML date input
      let formattedDate = "";
      if (d.deadline_date) {
        const date = new Date(d.deadline_date);
        formattedDate = date.toISOString().split('T')[0];
      }
      
      setFormData({
        department: d.department || "",
        position_title: d.position_title || "",
        employment_type: d.employment_type || "",
        number_of_positions: d.number_of_positions || 1,
        justification: d.justification || "",
        approval_status: d.approval_status || "pending",
        approved_by: d.approved_by ? String(d.approved_by) : "",
        deadline_date: formattedDate,
      });
    } catch (error) {
      Swal.fire("Error", "Failed to load job requisition", "error");
      navigate("/recruitment/job-requisitions");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : parseInt(value)) : value,
    }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.department) newErrors.department = ["Department is required"];
    if (!formData.position_title) newErrors.position_title = ["Position title is required"];
    if (formData.position_title?.length > 200) newErrors.position_title = ["Position title must not exceed 200 characters"];
    if (!formData.employment_type) newErrors.employment_type = ["Employment type is required"];
    if (!formData.number_of_positions || formData.number_of_positions < 1) {
      newErrors.number_of_positions = ["Number of positions must be at least 1"];
    }
    if (!formData.justification) newErrors.justification = ["Justification is required"];
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setSaving(true);
    setErrors({});
    
    try {
      const dataToSend = {
        ...formData,
        approved_by: formData.approved_by || null,
        deadline_date: formData.deadline_date || null,
      };
      
      if (isEdit) {
        await put(`/recruitment/job-requisitions/${id}`, dataToSend);
        Swal.fire("Success", "Job requisition updated successfully", "success");
      } else {
        await post("/recruitment/job-requisitions", dataToSend);
        Swal.fire("Success", "Job requisition created successfully", "success");
      }
      navigate("/recruitment/job-requisitions");
    } catch (error) {
      if (error.response?.status === 422 && error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        Swal.fire("Error", error.response?.data?.message || "Failed to save job requisition", "error");
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
          <span className="text-gray-500 text-sm">Loading job applications...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/recruitment/job-requisitions")}
          className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-bold text-gray-800">
            {isEdit ? "Edit Job Application" : "Create Job Application"}
          </h2>
          <p className="text-[11px] text-gray-400">
            {isEdit ? "Update job application details" : "Request a new hire for your department"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Job Details Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">Job Details</h3>
                <p className="text-[10px] text-gray-500">Position and department information</p>
              </div>
            </div>
          </div>
          
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Department */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                Department *
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
                className={inputClass("department")}
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept.value} value={dept.value}>{dept.label}</option>
                ))}
              </select>
              {err("department") && <p className="text-red-500 text-[10px] mt-1">{err("department")}</p>}
            </div>

            {/* Position Title */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                Position Title *
              </label>
              <input
                type="text"
                name="position_title"
                value={formData.position_title}
                onChange={handleChange}
                required
                maxLength={200}
                placeholder="e.g. Senior Mathematics Teacher"
                className={inputClass("position_title")}
              />
              {err("position_title") && <p className="text-red-500 text-[10px] mt-1">{err("position_title")}</p>}
            </div>

            {/* Employment Type */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                Employment Type *
              </label>
              <select
                name="employment_type"
                value={formData.employment_type}
                onChange={handleChange}
                required
                className={inputClass("employment_type")}
              >
                {EMPLOYMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              {err("employment_type") && <p className="text-red-500 text-[10px] mt-1">{err("employment_type")}</p>}
            </div>

            {/* Number of Positions */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                Number of Positions *
              </label>
              <input
                type="number"
                name="number_of_positions"
                value={formData.number_of_positions}
                onChange={handleChange}
                required
                min={1}
                placeholder="e.g. 2"
                className={inputClass("number_of_positions")}
              />
              {err("number_of_positions") && <p className="text-red-500 text-[10px] mt-1">{err("number_of_positions")}</p>}
            </div>

            {/* Justification */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                Justification *
              </label>
              <textarea
                name="justification"
                value={formData.justification}
                onChange={handleChange}
                required
                rows={4}
                placeholder="Explain why this position is needed (e.g., Student enrollment increased by 20%, existing staff workload...)"
                className={inputClass("justification")}
              />
              {err("justification") && <p className="text-red-500 text-[10px] mt-1">{err("justification")}</p>}
            </div>

            {/* Deadline Date */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                Deadline Date
              </label>
              <input
                type="date"
                name="deadline_date"
                value={formData.deadline_date}
                onChange={handleChange}
                className={inputClass("deadline_date")}
              />
              {err("deadline_date") && <p className="text-red-500 text-[10px] mt-1">{err("deadline_date")}</p>}
            </div>
          </div>
        </div>

        {/* Approval Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">Approval Information</h3>
                <p className="text-[10px] text-gray-500">Approval status and authorization</p>
              </div>
            </div>
          </div>
          
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Approval Status */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                Approval Status
              </label>
              <select
                name="approval_status"
                value={formData.approval_status}
                onChange={handleChange}
                className={inputClass("approval_status")}
              >
                {APPROVAL_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>

            {/* Approved By */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                Approved By
              </label>
              <select
                name="approved_by"
                value={formData.approved_by}
                onChange={handleChange}
                className={inputClass("approved_by")}
              >
                <option value="">Select Approver</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
              {err("approved_by") && <p className="text-red-500 text-[10px] mt-1">{err("approved_by")}</p>}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => navigate("/recruitment/job-requisitions")}
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
                {isEdit ? "Update Requisition" : "Create Requisition"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

