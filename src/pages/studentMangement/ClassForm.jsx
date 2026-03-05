import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";

export default function ClassForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const formRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    base_fee: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const classOptions = [
    "KG / کودکستان",
    "Grade 1",
    "Grade 2",
    "Grade 3",
    "Grade 4",
    "Grade 5",
    "Grade 6",
    "Grade 7",
    "Grade 8",
    "Grade 9",
  ];

  useEffect(() => {
    if (isEdit) {
      fetchClass();
    }
  }, [id]);

  const fetchClass = async () => {
    setLoading(true);
    try {
      const response = await get(`/student-management/classes/show/${id}`);
      setFormData(response.data);
    } catch (error) {
      Swal.fire("Error", "Failed to load class data", "error");
      navigate("/student-management/classes");
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
      if (isEdit) {
        await put(`/student-management/classes/update/${id}`, formData);
        Swal.fire("Success", "Class updated successfully", "success");
      } else {
        await post("/student-management/classes/store", formData);
        Swal.fire("Success", "Class created successfully", "success");
      }
      navigate("/student-management/classes");
    } catch (error) {
      if (error.response?.status === 422 && error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        Swal.fire("Error", error.response?.data?.message || "Failed to save class", "error");
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
        <button onClick={() => navigate("/student-management/classes")} className="p-2 text-gray-500 hover:text-teal-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <h2 className="text-lg font-bold text-gray-800">{isEdit ? "Edit Class" : "Add Class"}</h2>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 max-w-2xl grid grid-cols-1 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Class Name *</label>
          <select name="name" value={formData.name} onChange={handleChange} required className={getFieldClass("name")}>
            <option value="">Select Class</option>
            {classOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          {getFieldError("name") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("name")}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Base Fee (AFN) *</label>
          <input type="number" name="base_fee" value={formData.base_fee} onChange={handleChange} required className={getFieldClass("base_fee")} placeholder="e.g. 1500" />
          {getFieldError("base_fee") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("base_fee")}</p>}
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button type="button" onClick={() => navigate("/student-management/classes")} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium disabled:opacity-50">
            {saving ? "Saving..." : isEdit ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
