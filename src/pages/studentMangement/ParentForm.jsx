import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";

export default function ParentForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const formRef = useRef(null);

  const [formData, setFormData] = useState({
    father_name: "",
    father_name_en: "",
    grandfather_name: "",
    grandfather_name_en: "",
    father_education_level: "",
    mother_name: "",
    mother_phone: "",
    father_phone: "",
    father_occupation: "",
    mother_education_level: "",
    mother_tongue: "",
    monthly_income_usd: "",
    address: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetchParent();
    }
  }, [id]);

  const fetchParent = async () => {
    setLoading(true);
    try {
      const response = await get(`/student-management/families/show/${id}`);
      // API returns { success: true, data: familyObject }
      const familyData = response.data?.data || response.data;
      setFormData(familyData);
    } catch (error) {
      console.error("Error fetching family:", error);
      Swal.fire("Error", "Failed to load family data", "error");
      navigate("/student-management/parents");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      let familyId = id;
      if (isEdit) {
        await put(`/student-management/families/update/${id}`, formData);
        Swal.fire("Success", "Family updated successfully", "success");
      } else {
        const response = await post(
          "/student-management/families/store",
          formData,
        );
        Swal.fire("Success", "Family created successfully", "success");
        // Get the new family ID from response
        familyId = response.data?.data?.id || response.data?.id;
      }
      // Redirect to show page
      navigate(`/student-management/parents/show/${familyId}`);
    } catch (error) {
      if (error.response?.status === 422 && error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        Swal.fire(
          "Error",
          error.response?.data?.message || "Failed to save family",
          "error",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const getFieldError = (fieldName) => errors[fieldName]?.[0];

  const getFieldClass = (fieldName) => {
    const baseClass = "w-full px-3 py-2 border rounded-lg focus:ring-2 text-xs";
    return `${baseClass} ${getFieldError(fieldName) ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-teal-500"}`;
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="px-4 py-4 mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/student-management/parents")}
          className="p-2 text-gray-500 hover:text-teal-600"
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
        <h2 className="text-lg font-bold text-gray-800">
          {isEdit ? "Edit Family" : "Add Family"}
        </h2>
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Father's Name *
          </label>
          <input
            type="text"
            name="father_name"
            value={formData.father_name}
            onChange={handleChange}
            required
            className={getFieldClass("father_name")}
          />
          {getFieldError("father_name") && (
            <p className="text-red-500 text-[10px] mt-1">
              {getFieldError("father_name")}
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Father's Name (English)
          </label>
          <input
            type="text"
            name="father_name_en"
            value={formData.father_name_en}
            onChange={handleChange}
            className={getFieldClass("father_name_en")}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Grandfather's Name
          </label>
          <input
            type="text"
            name="grandfather_name"
            value={formData.grandfather_name}
            onChange={handleChange}
            className={getFieldClass("grandfather_name")}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Grandfather's Name (English)
          </label>
          <input
            type="text"
            name="grandfather_name_en"
            value={formData.grandfather_name_en}
            onChange={handleChange}
            className={getFieldClass("grandfather_name_en")}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Father's Education Level
          </label>
          <input
            type="text"
            name="father_education_level"
            value={formData.father_education_level}
            onChange={handleChange}
            className={getFieldClass("father_education_level")}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Father's Occupation
          </label>
          <input
            type="text"
            name="father_occupation"
            value={formData.father_occupation}
            onChange={handleChange}
            className={getFieldClass("father_occupation")}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Father's Phone
          </label>
          <input
            type="text"
            name="father_phone"
            value={formData.father_phone}
            onChange={handleChange}
            className={getFieldClass("father_phone")}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Mother's Name *
          </label>
          <input
            type="text"
            name="mother_name"
            value={formData.mother_name}
            onChange={handleChange}
            required
            className={getFieldClass("mother_name")}
          />
          {getFieldError("mother_name") && (
            <p className="text-red-500 text-[10px] mt-1">
              {getFieldError("mother_name")}
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Mother's Education Level
          </label>
          <input
            type="text"
            name="mother_education_level"
            value={formData.mother_education_level}
            onChange={handleChange}
            className={getFieldClass("mother_education_level")}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Mother's Phone
          </label>
          <input
            type="text"
            name="mother_phone"
            value={formData.mother_phone}
            onChange={handleChange}
            className={getFieldClass("mother_phone")}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Mother Tongue
          </label>
          <input
            type="text"
            name="mother_tongue"
            value={formData.mother_tongue}
            onChange={handleChange}
            className={getFieldClass("mother_tongue")}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Monthly Income (USD)
          </label>
          <input
            type="number"
            name="monthly_income_usd"
            value={formData.monthly_income_usd}
            onChange={handleChange}
            className={getFieldClass("monthly_income_usd")}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Address
          </label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            className={getFieldClass("address")}
            rows="2"
          />
        </div>
        <div className="md:col-span-2 flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={() => navigate("/student-management/parents")}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium disabled:opacity-50"
          >
            {saving ? "Saving..." : isEdit ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
