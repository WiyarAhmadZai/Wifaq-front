import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";

export default function GradeForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({ name: "", base_fee: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) fetchGrade();
  }, [id]);

  const fetchGrade = async () => {
    setLoading(true);
    try {
      const response = await get(`/grades/show/${id}`);
      const data = response.data?.data || response.data;
      setFormData({ name: data.name, base_fee: data.base_fee });
    } catch (error) {
      Swal.fire("Error", "Failed to load grade data", "error");
      navigate("/student-management/grades");
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
        await put(`/grades/update/${id}`, formData);
        Swal.fire("Success", "Grade updated successfully", "success");
      } else {
        await post("/grades/store", formData);
        Swal.fire("Success", "Grade created successfully", "success");
      }
      navigate("/student-management/grades");
    } catch (error) {
      if (error.response?.status === 422 && error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        Swal.fire("Error", error.response?.data?.message || "Failed to save grade", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const getFieldError = (field) => errors[field]?.[0];
  const fieldClass = (field) => {
    const base = "w-full px-3 py-2 border rounded-lg focus:ring-2 text-xs";
    return `${base} ${getFieldError(field) ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-teal-500"}`;
  };

  if (loading) return <div className="p-8 text-center text-xs text-gray-500">Loading...</div>;

  return (
    <div className="px-4 py-4 mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/student-management/grades")}
          className="p-2 text-gray-500 hover:text-teal-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-gray-800">
          {isEdit ? "Edit Grade" : "Add Grade"}
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 max-w-lg grid grid-cols-1 gap-4"
      >
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Grade Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="e.g. Grade 1, KG / کودکستان"
            className={fieldClass("name")}
          />
          {getFieldError("name") && (
            <p className="text-red-500 text-[10px] mt-1">{getFieldError("name")}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Base Fee (AFN) *
          </label>
          <input
            type="number"
            name="base_fee"
            value={formData.base_fee}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            placeholder="e.g. 1500"
            className={fieldClass("base_fee")}
          />
          {getFieldError("base_fee") && (
            <p className="text-red-500 text-[10px] mt-1">{getFieldError("base_fee")}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-2">
          <button
            type="button"
            onClick={() => navigate("/student-management/grades")}
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
