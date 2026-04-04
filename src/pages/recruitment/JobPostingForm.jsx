import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";
import Select from "react-select";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "closed", label: "Closed" },
  { value: "archived", label: "Archived" },
];

export default function JobPostingForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    requisition_id: "",
    title: "",
    description: "",
    requirements: [""],
    location: "",
    status: "published",
  });

  const [requisitions, setRequisitions] = useState([]);
  const [requisitionOptions, setRequisitionOptions] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchApprovedRequisitions();
    if (isEdit) fetchPosting();
  }, [id]);

  const fetchApprovedRequisitions = async () => {
    try {
      const response = await get("/recruitment/job-postings/approved-requisitions");
      const data = response.data?.data || [];
      const requisitionsArray = Array.isArray(data) ? data : [];
      setRequisitions(requisitionsArray);
      
      // Transform data for react-select
      const options = requisitionsArray.map((req) => ({
        value: req.id,
        label: `${req.position_title} - ${req.department}${
          req.deadline_date ? ` (Deadline: ${new Date(req.deadline_date).toLocaleDateString()})` : ""
        }`,
        ...req // Keep original data for reference
      }));
      setRequisitionOptions(options);
    } catch (error) {
      console.error("Failed to fetch requisitions", error);
    }
  };

  const fetchPosting = async () => {
    setLoading(true);
    try {
      const response = await get(`/recruitment/job-postings/${id}`);
      const d = response.data?.data || response.data;
      setFormData({
        requisition_id: d.requisition_id || "",
        title: d.title || "",
        description: d.description || "",
        requirements: d.requirements?.length > 0 ? d.requirements : [""],
        location: d.location || "",
        status: d.status || "published",
      });
      
      // Set the selected requisition option for react-select
      if (d.requisition_id && requisitionOptions.length > 0) {
        const selectedOption = requisitionOptions.find(opt => opt.value === d.requisition_id);
        if (selectedOption) {
          // We'll handle this in the component after options are loaded
        }
      }
    } catch (error) {
      Swal.fire("Error", "Failed to load job posting", "error");
      navigate("/recruitment/job-postings");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleRequisitionChange = (selectedOption) => {
    setFormData((prev) => ({ ...prev, requisition_id: selectedOption ? selectedOption.value : "" }));
    if (errors.requisition_id) setErrors((prev) => ({ ...prev, requisition_id: null }));
  };

  const handleRequirementChange = (index, value) => {
    const newRequirements = [...formData.requirements];
    newRequirements[index] = value;
    setFormData((prev) => ({ ...prev, requirements: newRequirements }));
  };

  const addRequirement = () => {
    setFormData((prev) => ({ ...prev, requirements: [...prev.requirements, ""] }));
  };

  const removeRequirement = (index) => {
    if (formData.requirements.length === 1) {
      setFormData((prev) => ({ ...prev, requirements: [""] }));
      return;
    }
    const newRequirements = formData.requirements.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, requirements: newRequirements }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.requisition_id) newErrors.requisition_id = ["Please select a job requisition"];
    if (!formData.title) newErrors.title = ["Job title is required"];
    if (formData.title?.length > 200) newErrors.title = ["Title must not exceed 200 characters"];
    if (!formData.description) newErrors.description = ["Description is required"];
    if (!formData.location) newErrors.location = ["Location is required"];
    if (formData.location?.length > 100) newErrors.location = ["Location must not exceed 100 characters"];
    
    const validRequirements = formData.requirements.filter(r => r.trim() !== "");
    if (validRequirements.length === 0) newErrors.requirements = ["At least one requirement is required"];

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
        requisition_id: formData.requisition_id,
        title: formData.title,
        description: formData.description,
        location: formData.location,
        requirements: formData.requirements.filter(r => r.trim() !== ""),
        status: formData.status || "published",
      };

      if (isEdit) {
        await put(`/recruitment/job-postings/${id}`, dataToSend);
        Swal.fire("Success", "Job posting updated successfully", "success");
      } else {
        await post("/recruitment/job-postings", dataToSend);
        Swal.fire("Success", "Job posting created successfully", "success");
      }
      navigate("/recruitment/job-postings");
    } catch (error) {
      if (error.response?.status === 422 && error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        Swal.fire("Error", error.response?.data?.message || "Failed to save job posting", "error");
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
          <span className="text-gray-500 text-sm">Loading job posting...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/recruitment/job-postings")}
          className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-bold text-gray-800">
            {isEdit ? "Edit Job Posting" : "Create Job Posting"}
          </h2>
          <p className="text-[11px] text-gray-400">
            {isEdit ? "Update job posting details" : "Create a new job posting from approved requisition"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Job Requisition Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">Job Requisition</h3>
                <p className="text-[10px] text-gray-500">Select an approved requisition</p>
              </div>
            </div>
          </div>

          <div className="p-5" style={{ position: 'relative', zIndex: 1 }}>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
              Requisition *
            </label>
            <Select
              name="requisition_id"
              value={requisitionOptions.find(option => option.value === formData.requisition_id) || null}
              onChange={handleRequisitionChange}
              options={requisitionOptions}
              placeholder="Select Requisition"
              isSearchable
              isClearable
              isDisabled={isEdit}
              className={`react-select-container ${err("requisition_id") ? "react-select-error" : ""}`}
              classNamePrefix="react-select"
              menuPortalTarget={document.body}
              menuPosition="fixed"
              styles={{
                control: (baseStyles, state) => ({
                  ...baseStyles,
                  borderColor: err("requisition_id") ? "#f87171" : state.isFocused ? "#14b8a6" : "#e5e7eb",
                  boxShadow: err("requisition_id") ? "0 0 0 1px #f87171" : state.isFocused ? "0 0 0 1px #14b8a6" : "none",
                  "&:hover": {
                    borderColor: err("requisition_id") ? "#f87171" : "#d1d5db",
                  },
                  fontSize: "0.75rem",
                  minHeight: "42px",
                }),
                option: (baseStyles) => ({
                  ...baseStyles,
                  fontSize: "0.75rem",
                }),
                noOptionsMessage: (baseStyles) => ({
                  ...baseStyles,
                  fontSize: "0.75rem",
                }),
                menuPortal: (baseStyles) => ({
                  ...baseStyles,
                  zIndex: 9999,
                }),
              }}
            />
            {err("requisition_id") && <p className="text-red-500 text-[10px] mt-1">{err("requisition_id")}</p>}
            {requisitionOptions.length === 0 && (
              <p className="text-amber-600 text-[10px] mt-2">
                No approved requisitions available. Please approve a job requisition first.
              </p>
            )}
          </div>
        </div>

        {/* Job Details Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-teal-50 to-teal-50 border-b border-teal-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">Job Details</h3>
                <p className="text-[10px] text-gray-500">Enter job posting information</p>
              </div>
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                Job Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                maxLength={200}
                placeholder="e.g. Senior Mathematics Teacher"
                className={inputClass("title")}
              />
              {err("title") && <p className="text-red-500 text-[10px] mt-1">{err("title")}</p>}
            </div>

            {/* Location */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                Location *
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
                maxLength={100}
                placeholder="e.g. Main Campus, Building A"
                className={inputClass("location")}
              />
              {err("location") && <p className="text-red-500 text-[10px] mt-1">{err("location")}</p>}
            </div>

            {/* Hidden status field - managed via list actions */}
            <input type="hidden" name="status" value={formData.status} />

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                placeholder="Enter detailed job description including responsibilities and expectations..."
                className={inputClass("description")}
              />
              {err("description") && <p className="text-red-500 text-[10px] mt-1">{err("description")}</p>}
            </div>
          </div>
        </div>

        {/* Requirements Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-teal-50 to-teal-50 border-b border-teal-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">Requirements</h3>
                <p className="text-[10px] text-gray-500">Add job requirements and qualifications</p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-3">
            {formData.requirements.map((req, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={req}
                  onChange={(e) => handleRequirementChange(index, e.target.value)}
                  placeholder={`Requirement ${index + 1}`}
                  className={`${inputClass("requirements")} flex-1`}
                />
                <button
                  type="button"
                  onClick={() => removeRequirement(index)}
                  className="px-3 py-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  title="Remove requirement"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
            {err("requirements") && <p className="text-red-500 text-[10px]">{err("requirements")}</p>}
            
            <button
              type="button"
              onClick={addRequirement}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Requirement
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => navigate("/recruitment/job-postings")}
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
                {isEdit ? "Update Posting" : "Create Posting"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
