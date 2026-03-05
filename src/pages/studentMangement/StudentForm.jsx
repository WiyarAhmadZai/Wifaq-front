import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";

export default function StudentForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const formRef = useRef(null);

  const [formData, setFormData] = useState({
    family_id: "",
    first_name: "",
    last_name: "",
    date_of_birth: "",
    class_id: "",
    uniform_required: false,
    transportation_required: false,
    child_order_in_family: "",
    special_status: "none",
    employee_duration_id: "",
    enrollment_date: new Date().toISOString().split("T")[0],
  });

  const [classes, setClasses] = useState([]);
  const [employmentDurations, setEmploymentDurations] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const specialStatusOptions = [
    { value: "none", label: "None" },
    { value: "orphan", label: "Orphan" },
    { value: "employee", label: "Employee Child" },
  ];

  useEffect(() => {
    fetchClasses();
    fetchEmploymentDurations();
    if (isEdit) {
      fetchStudent();
    }
  }, [id]);

  const fetchClasses = async () => {
    try {
      const response = await get("/student-management/classes?per_page=1000");
      const data = response.data?.data || response.data || [];
      setClasses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch classes", error);
    }
  };

  const fetchEmploymentDurations = async () => {
    try {
      const response = await get("/hr/staff?per_page=1000");
      const data = response.data?.data || response.data || [];
      setEmploymentDurations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch employment durations", error);
    }
  };

  const fetchStudent = async () => {
    setLoading(true);
    try {
      const response = await get(`/student-management/students/show/${id}`);
      const data = response.data;
      setFormData({
        family_id: data.family_id || "",
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        date_of_birth: data.date_of_birth || "",
        class_id: data.class_id || "",
        uniform_required: data.uniform_required || false,
        transportation_required: data.transportation_required || false,
        child_order_in_family: data.child_order_in_family || "",
        special_status: data.special_status || "none",
        employee_duration_id: data.employee_duration_id || "",
        enrollment_date: data.enrollment_date || new Date().toISOString().split("T")[0],
      });
    } catch (error) {
      Swal.fire("Error", "Failed to load student data", "error");
      navigate("/student-management/students");
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
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    const dataToSend = {
      ...formData,
      employee_duration_id: formData.special_status === "employee" ? formData.employee_duration_id : null,
    };

    try {
      if (isEdit) {
        await put(`/student-management/students/update/${id}`, dataToSend);
        Swal.fire("Success", "Student updated successfully", "success");
      } else {
        await post("/student-management/students/store", dataToSend);
        Swal.fire("Success", "Student created successfully", "success");
      }
      navigate("/student-management/students");
    } catch (error) {
      if (error.response?.status === 422 && error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        Swal.fire("Error", error.response?.data?.message || "Failed to save student", "error");
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
        <button onClick={() => navigate("/student-management/students")} className="p-2 text-gray-500 hover:text-teal-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-gray-800">{isEdit ? "Edit Student" : "Add Student"}</h2>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Family ID *</label>
          <input type="text" name="family_id" value={formData.family_id} onChange={handleChange} required className={getFieldClass("family_id")} />
          {getFieldError("family_id") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("family_id")}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Child Order in Family</label>
          <input type="number" name="child_order_in_family" value={formData.child_order_in_family} onChange={handleChange} className={getFieldClass("child_order_in_family")} placeholder="e.g. 1, 2, 3" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
          <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} required className={getFieldClass("first_name")} />
          {getFieldError("first_name") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("first_name")}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Last Name *</label>
          <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} required className={getFieldClass("last_name")} />
          {getFieldError("last_name") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("last_name")}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth *</label>
          <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} required className={getFieldClass("date_of_birth")} />
          {getFieldError("date_of_birth") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("date_of_birth")}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Class *</label>
          <select name="class_id" value={formData.class_id} onChange={handleChange} required className={getFieldClass("class_id")}>
            <option value="">Select Class</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
          {getFieldError("class_id") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("class_id")}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Special Status</label>
          <select name="special_status" value={formData.special_status} onChange={handleChange} className={getFieldClass("special_status")}>
            {specialStatusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        {formData.special_status === "employee" && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Employee (Parent) *</label>
            <select name="employee_duration_id" value={formData.employee_duration_id} onChange={handleChange} required={formData.special_status === "employee"} className={getFieldClass("employee_duration_id")}>
              <option value="">Select Employee</option>
              {employmentDurations.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>
            {getFieldError("employee_duration_id") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("employee_duration_id")}</p>}
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Enrollment Date *</label>
          <input type="date" name="enrollment_date" value={formData.enrollment_date} onChange={handleChange} required className={getFieldClass("enrollment_date")} />
          {getFieldError("enrollment_date") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("enrollment_date")}</p>}
        </div>
        <div className="md:col-span-2 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <input type="checkbox" name="uniform_required" id="uniform_required" checked={formData.uniform_required} onChange={handleChange} className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500" />
            <label htmlFor="uniform_required" className="text-xs font-medium text-gray-700">Uniform Required</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" name="transportation_required" id="transportation_required" checked={formData.transportation_required} onChange={handleChange} className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500" />
            <label htmlFor="transportation_required" className="text-xs font-medium text-gray-700">Transportation Required</label>
          </div>
        </div>
        <div className="md:col-span-2 flex justify-end gap-3 mt-4">
          <button type="button" onClick={() => navigate("/student-management/students")} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium disabled:opacity-50">
            {saving ? "Saving..." : isEdit ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
