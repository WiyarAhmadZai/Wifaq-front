import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";

export default function StaffForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const formRef = useRef(null);

  const [formData, setFormData] = useState({
    full_name: "",
    department: "",
    employment_type: "WS",
    base_salary: "",
    required_time: "",
    track_attendance: false,
    total_classes: "",
    rate_per_class: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetchStaff();
    }
  }, [id]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const response = await get(`/hr/staff/show/${id}`);
      const data = response.data;
      setFormData({
        full_name: data.full_name || "",
        department: data.department || "",
        employment_type: data.employment_type || "WS",
        base_salary: data.base_salary || "",
        required_time: data.required_time || "",
        track_attendance: data.track_attendance || false,
        total_classes: data.total_classes || "",
        rate_per_class: data.rate_per_class || "",
      });
    } catch (error) {
      Swal.fire("Error", "Failed to load staff data", "error");
      navigate("/hr/staff");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const scrollToFirstError = (validationErrors) => {
    const firstErrorField = Object.keys(validationErrors)[0];
    if (firstErrorField && formRef.current) {
      const errorElement = formRef.current.querySelector(
        `[name="${firstErrorField}"]`,
      );
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: "smooth", block: "center" });
        errorElement.focus();
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const dataToSend = { ...formData };

      if (isEdit) {
        await put(`/hr/staff/update/${id}`, dataToSend);
        Swal.fire("Success", "Staff updated successfully", "success");
        navigate("/hr/staff");
      } else {
        const response = await post("/hr/staff/store", dataToSend);
        Swal.fire("Success", "Staff created successfully", "success");
        navigate("/hr/staff");
      }
    } catch (error) {
      if (error.response?.status === 422 && error.response?.data?.errors) {
        // Validation errors
        const validationErrors = error.response.data.errors;
        setErrors(validationErrors);
        scrollToFirstError(validationErrors);
      } else {
        // Other errors
        const message = error.response?.data?.message || "Failed to save staff";
        Swal.fire("Error", message, "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const getFieldError = (fieldName) => errors[fieldName]?.[0];

  const getFieldClass = (fieldName) => {
    const baseClass = "w-full px-3 py-2 border rounded-lg focus:ring-2 text-xs";
    const errorClass = getFieldError(fieldName)
      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
      : "border-gray-300 focus:ring-teal-500 focus:border-teal-500";
    return `${baseClass} ${errorClass}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/hr/staff")}
          className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-bold text-gray-800">
            {isEdit ? "Edit Staff" : "Add Staff"}
          </h2>
          <p className="text-xs text-gray-500">
            {isEdit ? "Update staff information" : "Create new staff record"}
          </p>
        </div>
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
        autoComplete="off"
      >
        {/* Basic Information */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">
            Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                autoComplete="off"
                data-lpignore="true"
                className={getFieldClass("full_name")}
              />
              {getFieldError("full_name") && (
                <p className="text-red-500 text-xs mt-1">
                  {getFieldError("full_name")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Employment Information */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">
            Employment Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Department{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className={getFieldClass("department")}
              >
                <option value="">Select Department</option>
                <option value="hr">Human Resources</option>
                <option value="finance">Finance</option>
                <option value="academic">Academic</option>
                <option value="admin">Administration</option>
                <option value="it">IT</option>
                <option value="operations">Operations</option>
              </select>
              {getFieldError("department") && (
                <p className="text-red-500 text-xs mt-1">
                  {getFieldError("department")}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Employment Type *
              </label>
              <select
                name="employment_type"
                value={formData.employment_type}
                onChange={handleChange}
                required
                className={getFieldClass("employment_type")}
              >
                <option value="WS">WS</option>
                <option value="WLS">WLS</option>
                <option value="WLS-CT">WLS-CT</option>
              </select>
              {getFieldError("employment_type") && (
                <p className="text-red-500 text-xs mt-1">
                  {getFieldError("employment_type")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Fields Based on Employment Type */}
        {(formData.employment_type === "WS" ||
          formData.employment_type === "WLS") && (
          <div className="mb-6 bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-3">
              WS/WLS Specific Fields
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Base Salary (AFN)
                </label>
                <input
                  type="number"
                  name="base_salary"
                  value={formData.base_salary}
                  onChange={handleChange}
                  className={getFieldClass("base_salary")}
                />
                {getFieldError("base_salary") && (
                  <p className="text-red-500 text-xs mt-1">
                    {getFieldError("base_salary")}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Required Time
                </label>
                <input
                  type="time"
                  name="required_time"
                  value={formData.required_time}
                  onChange={handleChange}
                  className={getFieldClass("required_time")}
                />
                {getFieldError("required_time") && (
                  <p className="text-red-500 text-xs mt-1">
                    {getFieldError("required_time")}
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="track_attendance"
                    checked={formData.track_attendance}
                    onChange={handleChange}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-xs text-gray-700">
                    Track Attendance?
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {formData.employment_type === "WLS-CT" && (
          <div className="mb-6 bg-green-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-green-800 mb-3">
              WLS-CT Specific Fields
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Total Classes
                </label>
                <input
                  type="number"
                  name="total_classes"
                  value={formData.total_classes}
                  onChange={handleChange}
                  className={getFieldClass("total_classes")}
                />
                {getFieldError("total_classes") && (
                  <p className="text-red-500 text-xs mt-1">
                    {getFieldError("total_classes")}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Rate/Class (AFN)
                </label>
                <input
                  type="number"
                  name="rate_per_class"
                  value={formData.rate_per_class}
                  onChange={handleChange}
                  step="0.01"
                  className={getFieldClass("rate_per_class")}
                />
                {getFieldError("rate_per_class") && (
                  <p className="text-red-500 text-xs mt-1">
                    {getFieldError("rate_per_class")}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Additional Information - Removed since no extra fields needed */}

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => navigate("/hr/staff")}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-xs font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-xs font-medium disabled:opacity-50"
          >
            {saving ? "Saving..." : isEdit ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
