import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";

export default function StudentEnrollmentForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const formRef = useRef(null);

  const [formData, setFormData] = useState({
    student_id: "",
    academic_term_id: "",
    class_id: "",
    discount_percent: "",
    discount_amount: 0,
    is_4th_child_free: false,
    employee_duration_applied: "",
    foundation_help_requested: false,
    foundation_help_amount: "",
    final_fee: "",
    enrollment_type: "new",
  });

  const [students, setStudents] = useState([]);
  const [academicTerms, setAcademicTerms] = useState([]);
  const [classes, setClasses] = useState([]);
  const [employmentDurations, setEmploymentDurations] = useState([]);
  const [classFee, setClassFee] = useState(0);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const discountOptions = [15, 20, 25, 30, 35, 40, 45, 50];
  const enrollmentTypeOptions = [
    { value: "new", label: "New Enrollment" },
    { value: "promotion", label: "Promotion" },
    { value: "repeat", label: "Repeat" },
  ];

  useEffect(() => {
    fetchStudents();
    fetchAcademicTerms();
    fetchClasses();
    fetchEmploymentDurations();
    if (isEdit) {
      fetchEnrollment();
    }
  }, [id]);

  useEffect(() => {
    calculateDiscountAmount();
  }, [formData.discount_percent, classFee, formData.is_4th_child_free]);

  const fetchStudents = async () => {
    try {
      const response = await get("/student-management/students?per_page=1000");
      const data = response.data?.data || response.data || [];
      setStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch students", error);
    }
  };

  const fetchAcademicTerms = async () => {
    try {
      const response = await get(
        "/student-management/academic-terms?per_page=1000",
      );
      const data = response.data?.data || response.data || [];
      setAcademicTerms(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch academic terms", error);
    }
  };

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

  const fetchEnrollment = async () => {
    setLoading(true);
    try {
      const response = await get(
        `/student-management/student-enrollments/show/${id}`,
      );
      const data = response.data;
      setFormData({
        student_id: data.student_id || "",
        academic_term_id: data.academic_term_id || "",
        class_id: data.class_id || "",
        discount_percent: data.discount_percent || "",
        discount_amount: data.discount_amount || 0,
        is_4th_child_free: data.is_4th_child_free || false,
        employee_duration_applied: data.employee_duration_applied || "",
        foundation_help_requested: data.foundation_help_requested || false,
        foundation_help_amount: data.foundation_help_amount || "",
        final_fee: data.final_fee || "",
        enrollment_type: data.enrollment_type || "new",
      });
      if (data.class_id) {
        const selectedClass = classes.find((c) => c.id === data.class_id);
        if (selectedClass) setClassFee(selectedClass.fee || 0);
      }
    } catch (error) {
      Swal.fire("Error", "Failed to load enrollment data", "error");
      navigate("/student-management/student-enrollments");
    } finally {
      setLoading(false);
    }
  };

  const calculateDiscountAmount = () => {
    let baseFee = classFee;
    let discountPercent = parseFloat(formData.discount_percent) || 0;

    if (formData.is_4th_child_free) {
      discountPercent = 100;
    }

    const discountAmount = (baseFee * discountPercent) / 100;
    const finalFee = baseFee - discountAmount;

    setFormData((prev) => ({
      ...prev,
      discount_amount: discountAmount.toFixed(2),
      final_fee: finalFee > 0 ? finalFee.toFixed(2) : "0.00",
    }));
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

  const handleClassChange = (e) => {
    const classId = e.target.value;
    const selectedClass = classes.find((c) => c.id === parseInt(classId));
    if (selectedClass) {
      setClassFee(selectedClass.fee || 0);
    }
    setFormData((prev) => ({ ...prev, class_id: classId }));
    if (errors.class_id) {
      setErrors((prev) => ({ ...prev, class_id: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    const dataToSend = {
      ...formData,
      foundation_help_amount: formData.foundation_help_requested
        ? formData.foundation_help_amount
        : null,
    };

    try {
      if (isEdit) {
        await put(
          `/student-management/student-enrollments/update/${id}`,
          dataToSend,
        );
        Swal.fire("Success", "Enrollment updated successfully", "success");
      } else {
        await post("/student-management/student-enrollments/store", dataToSend);
        Swal.fire("Success", "Enrollment created successfully", "success");
      }
      navigate("/student-management/student-enrollments");
    } catch (error) {
      if (error.response?.status === 422 && error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        Swal.fire(
          "Error",
          error.response?.data?.message || "Failed to save enrollment",
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
          onClick={() => navigate("/student-management/student-enrollments")}
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
          {isEdit ? "Edit Enrollment" : "Add Enrollment"}
        </h2>
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Student *
          </label>
          <select
            name="student_id"
            value={formData.student_id}
            onChange={handleChange}
            required
            className={getFieldClass("student_id")}
          >
            <option value="">Select Student</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.first_name} {s.last_name}
              </option>
            ))}
          </select>
          {getFieldError("student_id") && (
            <p className="text-red-500 text-[10px] mt-1">
              {getFieldError("student_id")}
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Academic Term *
          </label>
          <select
            name="academic_term_id"
            value={formData.academic_term_id}
            onChange={handleChange}
            required
            className={getFieldClass("academic_term_id")}
          >
            <option value="">Select Academic Term</option>
            {academicTerms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {getFieldError("academic_term_id") && (
            <p className="text-red-500 text-[10px] mt-1">
              {getFieldError("academic_term_id")}
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Class *
          </label>
          <select
            name="class_id"
            value={formData.class_id}
            onChange={handleClassChange}
            required
            className={getFieldClass("class_id")}
          >
            <option value="">Select Class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (Fee: {c.fee || 0})
              </option>
            ))}
          </select>
          {getFieldError("class_id") && (
            <p className="text-red-500 text-[10px] mt-1">
              {getFieldError("class_id")}
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Enrollment Type
          </label>
          <select
            name="enrollment_type"
            value={formData.enrollment_type}
            onChange={handleChange}
            className={getFieldClass("enrollment_type")}
          >
            {enrollmentTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Discount Percent
          </label>
          <select
            name="discount_percent"
            value={formData.discount_percent}
            onChange={handleChange}
            disabled={formData.is_4th_child_free}
            className={`${getFieldClass("discount_percent")} ${formData.is_4th_child_free ? "bg-gray-100" : ""}`}
          >
            <option value="">No Discount</option>
            {discountOptions.map((d) => (
              <option key={d} value={d}>
                {d}%
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Employee Duration Applied
          </label>
          <select
            name="employee_duration_applied"
            value={formData.employee_duration_applied}
            onChange={handleChange}
            className={getFieldClass("employee_duration_applied")}
          >
            <option value="">None</option>
            {employmentDurations.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="is_4th_child_free"
            id="is_4th_child_free"
            checked={formData.is_4th_child_free}
            onChange={handleChange}
            className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
          />
          <label
            htmlFor="is_4th_child_free"
            className="text-xs font-medium text-gray-700"
          >
            4th Child Free (100% Discount)
          </label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="foundation_help_requested"
            id="foundation_help_requested"
            checked={formData.foundation_help_requested}
            onChange={handleChange}
            className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
          />
          <label
            htmlFor="foundation_help_requested"
            className="text-xs font-medium text-gray-700"
          >
            Foundation Help Requested
          </label>
        </div>
        {formData.foundation_help_requested && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Foundation Help Amount
            </label>
            <input
              type="number"
              name="foundation_help_amount"
              value={formData.foundation_help_amount}
              onChange={handleChange}
              className={getFieldClass("foundation_help_amount")}
              placeholder="0.00"
              step="0.01"
            />
          </div>
        )}

        {/* Fee Calculation Display */}
        <div className="md:col-span-2 bg-teal-50 border border-teal-200 rounded-lg p-4 mt-2">
          <h4 className="text-sm font-semibold text-teal-800 mb-3">
            Fee Calculation
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-medium text-teal-700 mb-1">
                Base Class Fee
              </label>
              <div className="px-3 py-2 bg-white border border-teal-200 rounded-lg text-xs font-semibold text-teal-900">
                {classFee.toFixed(2)}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-teal-700 mb-1">
                Discount Amount
              </label>
              <div className="px-3 py-2 bg-white border border-teal-200 rounded-lg text-xs font-semibold text-red-600">
                -{parseFloat(formData.discount_amount || 0).toFixed(2)}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-teal-700 mb-1">
                Foundation Help
              </label>
              <div className="px-3 py-2 bg-white border border-teal-200 rounded-lg text-xs font-semibold text-blue-600">
                -
                {formData.foundation_help_requested
                  ? parseFloat(formData.foundation_help_amount || 0).toFixed(2)
                  : "0.00"}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-teal-700 mb-1">
                Final Fee *
              </label>
              <input
                type="number"
                name="final_fee"
                value={formData.final_fee}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-white border border-teal-300 rounded-lg text-xs font-bold text-teal-900 focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>
        <div className="md:col-span-2 flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={() => navigate("/student-management/student-enrollments")}
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
