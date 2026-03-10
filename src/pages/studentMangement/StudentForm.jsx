import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";

const steps = [
  {
    id: 1,
    title: "Personal Info",
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  },
  {
    id: 2,
    title: "Academic Info",
    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  },
  {
    id: 3,
    title: "Fees & Discounts",
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
];

function Toggle({ name, id, checked, onChange, label }) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-3 cursor-pointer group"
    >
      <div className="relative">
        <input
          type="checkbox"
          name={name}
          id={id}
          checked={checked}
          onChange={onChange}
          className="sr-only peer"
        />
        <div className="w-9 h-5 bg-gray-200 rounded-full peer-checked:bg-teal-500 transition-colors"></div>
        <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm peer-checked:translate-x-4 transition-transform"></div>
      </div>
      <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900">
        {label}
      </span>
    </label>
  );
}

export default function StudentForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [currentStep, setCurrentStep] = useState(1);
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
    academic_term_id: "",
    discount_percent: "",
    discount_amount: 0,
    is_4th_child_free: false,
    foundation_help_requested: false,
    foundation_help_amount: "",
    final_fee: "",
    enrollment_type: "new",
  });

  const [classes, setClasses] = useState([]);
  const [employmentDurations, setEmploymentDurations] = useState([]);
  const [academicTerms, setAcademicTerms] = useState([]);
  const [classFee, setClassFee] = useState(0);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const specialStatusOptions = [
    {
      value: "none",
      label: "None",
      color: "bg-gray-100 text-gray-700 border-gray-200",
    },
    {
      value: "orphan",
      label: "Orphan",
      color: "bg-amber-50 text-amber-700 border-amber-200",
    },
    {
      value: "employee",
      label: "Employee Child",
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
  ];
  const discountOptions = [15, 20, 25, 30, 35, 40, 45, 50];
  const enrollmentTypeOptions = [
    {
      value: "new",
      label: "New",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      value: "promotion",
      label: "Promotion",
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      value: "repeat",
      label: "Repeat",
      color: "bg-orange-50 text-orange-700 border-orange-200",
    },
  ];

  useEffect(() => {
    fetchClasses();
    fetchEmploymentDurations();
    fetchAcademicTerms();
    if (isEdit) fetchStudent();
  }, [id]);

  useEffect(() => {
    calculateDiscountAmount();
  }, [formData.discount_percent, classFee, formData.is_4th_child_free]);

  const fetchClasses = async () => {
    try {
      const response = await get("/grades/list");
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

  const fetchAcademicTerms = async () => {
    try {
      const response = await get("/academic-terms/list");
      const data = response.data?.data || response.data || [];
      setAcademicTerms(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch academic terms", error);
    }
  };

  const calculateDiscountAmount = () => {
    let baseFee = classFee;
    let discountPercent = parseFloat(formData.discount_percent) || 0;
    if (formData.is_4th_child_free) discountPercent = 100;
    const discountAmount = (baseFee * discountPercent) / 100;
    const finalFee = baseFee - discountAmount;
    setFormData((prev) => ({
      ...prev,
      discount_amount: discountAmount.toFixed(2),
      final_fee: finalFee > 0 ? finalFee.toFixed(2) : "0.00",
    }));
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
        enrollment_date:
          data.enrollment_date || new Date().toISOString().split("T")[0],
        academic_term_id: data.academic_term_id || "",
        discount_percent: data.discount_percent || "",
        discount_amount: data.discount_amount || 0,
        is_4th_child_free: data.is_4th_child_free || false,
        foundation_help_requested: data.foundation_help_requested || false,
        foundation_help_amount: data.foundation_help_amount || "",
        final_fee: data.final_fee || "",
        enrollment_type: data.enrollment_type || "new",
      });
      if (data.class_id) {
        const selectedClass = classes.find((c) => c.id === data.class_id);
        if (selectedClass) setClassFee(selectedClass.base_fee || 0);
      }
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
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleClassChange = (e) => {
    const classId = e.target.value;
    const selectedClass = classes.find((c) => c.id === parseInt(classId));
    if (selectedClass) setClassFee(selectedClass.base_fee || 0);
    setFormData((prev) => ({ ...prev, class_id: classId }));
    if (errors.class_id) setErrors((prev) => ({ ...prev, class_id: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const dataToSend = {
      ...formData,
      employee_duration_id:
        formData.special_status === "employee"
          ? formData.employee_duration_id
          : null,
      foundation_help_amount: formData.foundation_help_requested
        ? formData.foundation_help_amount
        : null,
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
        // Jump to step with first error
        const errorFields = Object.keys(error.response.data.errors);
        const step1Fields = [
          "family_id",
          "first_name",
          "last_name",
          "date_of_birth",
          "child_order_in_family",
        ];
        const step2Fields = [
          "class_id",
          "academic_term_id",
          "enrollment_type",
          "enrollment_date",
        ];
        if (errorFields.some((f) => step1Fields.includes(f))) setCurrentStep(1);
        else if (errorFields.some((f) => step2Fields.includes(f)))
          setCurrentStep(2);
        else setCurrentStep(3);
      } else {
        Swal.fire(
          "Error",
          error.response?.data?.message || "Failed to save student",
          "error",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const getFieldError = (fieldName) => errors[fieldName]?.[0];
  const inputClass = (fieldName) => {
    const base =
      "w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:outline-none text-xs transition-all";
    return `${base} ${getFieldError(fieldName) ? "border-red-400 focus:ring-red-300 bg-red-50" : "border-gray-200 focus:ring-teal-400 hover:border-gray-300"}`;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-teal-100 border-t-teal-600"></div>
          <span className="text-gray-500 text-sm">Loading student data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/student-management/students")}
          className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all"
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
            {isEdit ? "Edit Student" : "Enroll New Student"}
          </h2>
          <p className="text-[11px] text-gray-400">
            Fill in the details below to {isEdit ? "update" : "register"} a
            student
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8 px-2">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center flex-1">
            <button
              type="button"
              onClick={() => setCurrentStep(step.id)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all ${
                currentStep === step.id
                  ? "bg-teal-600 text-white shadow-md shadow-teal-200"
                  : currentStep > step.id
                    ? "bg-teal-50 text-teal-700"
                    : "bg-gray-50 text-gray-400"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                  currentStep === step.id
                    ? "bg-white/20"
                    : currentStep > step.id
                      ? "bg-teal-100"
                      : "bg-gray-100"
                }`}
              >
                {currentStep > step.id ? (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  step.id
                )}
              </div>
              <span className="text-[11px] font-semibold hidden sm:block">
                {step.title}
              </span>
            </button>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 rounded-full ${currentStep > step.id ? "bg-teal-300" : "bg-gray-100"}`}
              />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Personal Info */}
        {currentStep === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in">
            <div className="px-5 py-4 bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-teal-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-teal-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={steps[0].icon}
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">
                    Personal Information
                  </h3>
                  <p className="text-[10px] text-gray-500">
                    Student identity and family details
                  </p>
                </div>
              </div>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                  Family ID *
                </label>
                <input
                  type="text"
                  name="family_id"
                  value={formData.family_id}
                  onChange={handleChange}
                  required
                  placeholder="e.g. WEN-FM-26-0001"
                  className={inputClass("family_id")}
                />
                {getFieldError("family_id") && (
                  <p className="text-red-500 text-[10px] mt-1">
                    {getFieldError("family_id")}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                  Child Order in Family
                </label>
                <input
                  type="number"
                  name="child_order_in_family"
                  value={formData.child_order_in_family}
                  onChange={handleChange}
                  placeholder="e.g. 1, 2, 3"
                  className={inputClass("child_order_in_family")}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                  First Name *
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  placeholder="Enter first name"
                  className={inputClass("first_name")}
                />
                {getFieldError("first_name") && (
                  <p className="text-red-500 text-[10px] mt-1">
                    {getFieldError("first_name")}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  placeholder="Enter last name"
                  className={inputClass("last_name")}
                />
                {getFieldError("last_name") && (
                  <p className="text-red-500 text-[10px] mt-1">
                    {getFieldError("last_name")}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  required
                  className={inputClass("date_of_birth")}
                />
                {getFieldError("date_of_birth") && (
                  <p className="text-red-500 text-[10px] mt-1">
                    {getFieldError("date_of_birth")}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Academic Info */}
        {currentStep === 2 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in">
            <div className="px-5 py-4 bg-gradient-to-r from-teal-50 to-indigo-50 border-b border-teal-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-teal-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={steps[1].icon}
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">
                    Academic Information
                  </h3>
                  <p className="text-[10px] text-gray-500">
                    Class, term, and enrollment details
                  </p>
                </div>
              </div>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                  Grade / Class *
                </label>
                <select
                  name="class_id"
                  value={formData.class_id}
                  onChange={handleClassChange}
                  required
                  className={inputClass("class_id")}
                >
                  <option value="">Select Grade</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} —{" "}
                      {parseFloat(cls.base_fee || 0).toLocaleString()} AFN
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
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                  Academic Term *
                </label>
                <select
                  name="academic_term_id"
                  value={formData.academic_term_id}
                  onChange={handleChange}
                  required
                  className={inputClass("academic_term_id")}
                >
                  <option value="">Select Term</option>
                  {academicTerms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.is_current ? "(Current)" : ""}
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
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                  Enrollment Date *
                </label>
                <input
                  type="date"
                  name="enrollment_date"
                  value={formData.enrollment_date}
                  onChange={handleChange}
                  required
                  className={inputClass("enrollment_date")}
                />
                {getFieldError("enrollment_date") && (
                  <p className="text-red-500 text-[10px] mt-1">
                    {getFieldError("enrollment_date")}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                  Enrollment Type
                </label>
                <div className="flex gap-2">
                  {enrollmentTypeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          enrollment_type: opt.value,
                        }))
                      }
                      className={`flex-1 px-2 py-2.5 rounded-lg text-[11px] font-semibold border transition-all ${
                        formData.enrollment_type === opt.value
                          ? `${opt.color} ring-2 ring-offset-1 ring-teal-400`
                          : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2 pt-2 border-t border-gray-100 mt-1">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Options
                </p>
                <div className="flex flex-wrap gap-x-8 gap-y-3">
                  <Toggle
                    name="uniform_required"
                    id="uniform_required"
                    checked={formData.uniform_required}
                    onChange={handleChange}
                    label="Uniform Required"
                  />
                  <Toggle
                    name="transportation_required"
                    id="transportation_required"
                    checked={formData.transportation_required}
                    onChange={handleChange}
                    label="Transportation Required"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Fees & Discounts */}
        {currentStep === 3 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in">
            <div className="px-5 py-4 bg-gradient-to-r from-teal-50 to-pink-50 border-b border-teal-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-teal-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={steps[2].icon}
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">
                    Fees & Discounts
                  </h3>
                  <p className="text-[10px] text-gray-500">
                    Configure fee calculations and discounts
                  </p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-5">
              {/* Special Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-gray-100">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                    Special Status
                  </label>
                  <div className="flex gap-2">
                    {specialStatusOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            special_status: opt.value,
                          }))
                        }
                        className={`flex-1 px-2 py-2 rounded-lg text-[11px] font-semibold border transition-all ${
                          formData.special_status === opt.value
                            ? `${opt.color} ring-2 ring-offset-1 ring-teal-400`
                            : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {formData.special_status === "employee" && (
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                      Employee (Parent) *
                    </label>
                    <select
                      name="employee_duration_id"
                      value={formData.employee_duration_id}
                      onChange={handleChange}
                      required
                      className={inputClass("employee_duration_id")}
                    >
                      <option value="">Select Employee</option>
                      {employmentDurations.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.full_name}
                        </option>
                      ))}
                    </select>
                    {getFieldError("employee_duration_id") && (
                      <p className="text-red-500 text-[10px] mt-1">
                        {getFieldError("employee_duration_id")}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Toggles row */}
              <div className="flex flex-wrap gap-x-8 gap-y-3 pb-4 border-b border-gray-100">
                <Toggle
                  name="is_4th_child_free"
                  id="is_4th_child_free"
                  checked={formData.is_4th_child_free}
                  onChange={handleChange}
                  label="4th Child Free (100%)"
                />
                <Toggle
                  name="foundation_help_requested"
                  id="foundation_help_requested"
                  checked={formData.foundation_help_requested}
                  onChange={handleChange}
                  label="Foundation Help"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                    Discount Percent
                  </label>
                  <select
                    name="discount_percent"
                    value={formData.discount_percent}
                    onChange={handleChange}
                    disabled={formData.is_4th_child_free}
                    className={`${inputClass("discount_percent")} ${formData.is_4th_child_free ? "bg-gray-50 opacity-60" : ""}`}
                  >
                    <option value="">No Discount</option>
                    {discountOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}%
                      </option>
                    ))}
                  </select>
                </div>
                {formData.foundation_help_requested && (
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                      Foundation Help Amount
                    </label>
                    <input
                      type="number"
                      name="foundation_help_amount"
                      value={formData.foundation_help_amount}
                      onChange={handleChange}
                      placeholder="0.00"
                      step="0.01"
                      className={inputClass("foundation_help_amount")}
                    />
                  </div>
                )}
              </div>

              {/* Fee Summary Card */}
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl p-5 border border-teal-100 mt-2">
                <h4 className="text-xs font-bold text-teal-800 mb-4 flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  Fee Breakdown
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-teal-100">
                    <p className="text-[9px] font-bold text-teal-600 uppercase tracking-wider">
                      Base Fee
                    </p>
                    <p className="text-lg font-bold text-gray-800 mt-1">
                      {classFee.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-red-100">
                    <p className="text-[9px] font-bold text-red-500 uppercase tracking-wider">
                      Discount
                    </p>
                    <p className="text-lg font-bold text-red-600 mt-1">
                      -{parseFloat(formData.discount_amount || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <p className="text-[9px] font-bold text-blue-500 uppercase tracking-wider">
                      Foundation
                    </p>
                    <p className="text-lg font-bold text-blue-600 mt-1">
                      -
                      {formData.foundation_help_requested
                        ? parseFloat(
                            formData.foundation_help_amount || 0,
                          ).toFixed(2)
                        : "0.00"}
                    </p>
                  </div>
                  <div className="bg-teal-600 rounded-lg p-3">
                    <p className="text-[9px] font-bold text-teal-100 uppercase tracking-wider">
                      Final Fee
                    </p>
                    <input
                      type="number"
                      name="final_fee"
                      value={formData.final_fee}
                      onChange={handleChange}
                      required
                      className="w-full bg-transparent text-lg font-bold text-white mt-1 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6">
          <button
            type="button"
            onClick={() =>
              currentStep === 1
                ? navigate("/student-management/students")
                : setCurrentStep(currentStep - 1)
            }
            className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-all flex items-center gap-1.5"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {currentStep === 1 ? "Cancel" : "Back"}
          </button>

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep + 1)}
              className="px-5 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 transition-all shadow-sm flex items-center gap-1.5"
            >
              Next
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          ) : (
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
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {isEdit ? "Update Student" : "Enroll Student"}
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
