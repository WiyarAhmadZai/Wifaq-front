import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Select from "react-select";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";
import { handleValidationErrors } from "../../utils/formErrors";

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

// Desired Role labels mapping (matching the enum labels)
const DESIRED_ROLE_LABELS = {
  motion_graphics_designer: "طراح موشن گرافیک - Motion Graphics Designer",
  curriculum_expert: "متخصص نصاب - Curriculum Expert",
  visual_learning_specialist: "متخصص یادگیری بصری - Visual Learning Specialist",
  school_psychology_counselor: "مشاور روانشناسی مدرسه - School Psychology Counselor",
  social_religious_studies_teacher: "آموزگار علوم اجتماعی و مذهبی - Social & Religious Studies Teacher",
  chief_science_teacher_lab_manager: "آموزگار ارشد علوم و مدیر آزمایشگاه - Chief Science Teacher & Lab Manager",
  dari_pashto_teacher: "آموزگار دری و پشتو - Dari & Pashto Teacher",
  coding_teacher_computer_lab_manager: "آموزگار کدنویسی و مدیر لابراتوار کمپیوتر - Coding Teacher & Computer Lab Manager",
  arabic_teacher_wisal: "آموزگار عربی (ویسال) - Arabic Teacher (Wisal)",
  educational_videographer: "فیلمبردار آموزشی - Educational Videographer",
  security_guard: "محافظ/نگهبان - Security Guard",
  other: "سایر - Other",
};

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
    approval_status: "approved",
    approved_by: "",
    deadline_date: "",
  });

  const [staff, setStaff] = useState([]);
  const [desiredRoles, setDesiredRoles] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      await fetchStaff();
      // Fetch enums first to populate dropdown options
      await fetchEnums();
      // Then fetch requisition data so dropdowns can match values
      if (isEdit) await fetchRequisition();
    };
    loadData();
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

  const fetchEnums = async () => {
    try {
      const response = await get("/recruitment/job-requisitions/enums");
      const data = response.data?.data || response.data || {};
      if (data.desired_roles) {
        setDesiredRoles(data.desired_roles);
      }
    } catch (error) {
      console.error("Failed to fetch enums", error);
    }
  };

  const fetchRequisition = async () => {
    setLoading(true);
    try {
      const response = await get(`/recruitment/job-requisitions/${id}`);
      const d = response.data?.data || response.data;
      console.log("Fetched data:", d);
      console.log("Position title value:", d.position_title);
      console.log("Desired roles available:", desiredRoles);
      console.log("Deadline date raw:", d.deadline_date);
      
      // Handle various date formats from backend
      let formattedDate = "";
      if (d.deadline_date) {
        // Handle ISO format with T (2026-03-30T00:00:00.000Z) or space (2026-03-30 00:00:00)
        formattedDate = d.deadline_date.toString().split(/[T\s]/)[0];
        console.log("Formatted date:", formattedDate);
      }
      
      setFormData({
        department: d.department?.value || d.department || "",
        position_title: d.position_title?.value || d.position_title || "",
        employment_type: d.employment_type?.value || d.employment_type || "",
        number_of_positions: d.number_of_positions || 1,
        justification: d.justification || "",
        approval_status: d.approval_status?.value || d.approval_status || "approved",
        approved_by: d.approved_by || "",
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
      const dataToSend = isEdit
        ? {
            // Exclude position_title in edit mode since it's read-only
            department: formData.department,
            employment_type: formData.employment_type,
            number_of_positions: formData.number_of_positions,
            justification: formData.justification,
            deadline_date: formData.deadline_date || null,
            approval_status: formData.approval_status || 'approved',
            approved_by: formData.approved_by || null,
          }
        : {
            department: formData.department,
            position_title: formData.position_title,
            employment_type: formData.employment_type,
            number_of_positions: formData.number_of_positions,
            justification: formData.justification,
            deadline_date: formData.deadline_date || null,
            approval_status: formData.approval_status || 'approved',
            approved_by: formData.approved_by || null,
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
      console.error("Submit error:", error);
      console.error("Error response:", error.response);
      if (!handleValidationErrors(error.response, setErrors)) {
        let errorMessage = "Failed to save job requisition";
        if (error.code === "ERR_NETWORK" || !error.response) {
          errorMessage = "Cannot connect to server. Please make sure the backend is running.";
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
        Swal.fire("Error", errorMessage, "error");
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
                Position Title {isEdit ? "" : "*"}
              </label>
              {isEdit ? (
                <input
                  type="text"
                  name="position_title"
                  value={DESIRED_ROLE_LABELS[formData.position_title] || formData.position_title}
                  readOnly
                  className={`${inputClass("position_title")} bg-gray-100 cursor-not-allowed`}
                />
              ) : (
                <Select
                  name="position_title"
                  value={desiredRoles.find(r => r === formData.position_title) 
                    ? { value: formData.position_title, label: DESIRED_ROLE_LABELS[formData.position_title] || formData.position_title }
                    : null
                  }
                  onChange={(selected) => handleChange({ 
                    target: { name: "position_title", value: selected?.value || "" }
                  })}
                  options={desiredRoles.map((role) => ({
                    value: role,
                    label: DESIRED_ROLE_LABELS[role] || role,
                  }))}
                  placeholder="Select Position Title"
                  isClearable
                  className={errors.position_title ? "react-select-error" : ""}
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      minHeight: "42px",
                      borderRadius: "0.75rem",
                      borderColor: errors.position_title ? "#f87171" : state.isFocused ? "#2dd4bf" : "#e5e7eb",
                      boxShadow: state.isFocused ? "0 0 0 2px rgba(45, 212, 191, 0.2)" : "none",
                      fontSize: "12px",
                      backgroundColor: errors.position_title ? "#fef2f2" : "#fff",
                    }),
                    placeholder: (base) => ({
                      ...base,
                      color: "#9ca3af",
                      fontSize: "12px",
                    }),
                    option: (base, state) => ({
                      ...base,
                      fontSize: "12px",
                      padding: "8px 12px",
                      backgroundColor: state.isSelected ? "#0d9488" : state.isFocused ? "#ccfbf1" : "#fff",
                      color: state.isSelected ? "#fff" : "#374151",
                    }),
                    singleValue: (base) => ({
                      ...base,
                      fontSize: "12px",
                      color: "#374151",
                    }),
                    input: (base) => ({
                      ...base,
                      fontSize: "12px",
                    }),
                    menu: (base) => ({
                      ...base,
                      borderRadius: "0.75rem",
                      marginTop: "4px",
                      zIndex: 50,
                    }),
                  }}
                />
              )}
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

            {/* Hidden fields for create mode - approval_status */}
            {!isEdit && (
              <input type="hidden" name="approval_status" value={formData.approval_status} />
            )}
          </div>
        </div>

        {/* Approval Section - Only show when editing */}
        {/* Note: Approval status is managed through the list view action button */}
        {/* Hidden fields for approval - managed via list actions */}
        {!isEdit && (
          <input type="hidden" name="approval_status" value={formData.approval_status} />
        )}

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

