import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";

const steps = [
  {
    id: 1,
    title: "Personal Info",
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  },
  {
    id: 2,
    title: "Contact Info",
    icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
  },
  {
    id: 3,
    title: "Employment",
    icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  },
  {
    id: 4,
    title: "Salary Setup",
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    id: 5,
    title: "Documents",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
];

const BLOOD_TYPES = [
  { value: "", label: "Select Blood Type" },
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
];

const DEPARTMENTS = [
  { value: "", label: "Select Department" },
  { value: "hr", label: "Human Resources" },
  { value: "finance", label: "Finance" },
  { value: "academic", label: "Academic" },
  { value: "admin", label: "Administration" },
  { value: "it", label: "IT" },
  { value: "operations", label: "Operations" },
];

const RANK_LEVELS = [
  { value: "", label: "Select Rank Level" },
  { value: "1", label: "Level 1" },
  { value: "2", label: "Level 2" },
  { value: "3", label: "Level 3" },
  { value: "4", label: "Level 4" },
  { value: "5", label: "Level 5" },
  { value: "6", label: "Level 6" },
  { value: "7", label: "Level 7" },
  { value: "8", label: "Level 8" },
  { value: "9", label: "Level 9" },
  { value: "10", label: "Level 10" },
];

// Demo staff list for supervisor selection
const DEMO_STAFF = [
  { id: 1, full_name: "Ahmad Rahimi" },
  { id: 2, full_name: "Mohammad Karimi" },
  { id: 3, full_name: "Fatima Noori" },
  { id: 4, full_name: "Ali Ahmadi" },
];

function generateStaffCode() {
  const year = new Date().getFullYear();
  const num = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
  return `WS-${year}-${num}`;
}

export default function StaffForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Section 1: Personal Info
    full_name_en: "",
    full_name_dari: "",
    father_name: "",
    date_of_birth: "",
    national_id: "",
    profile_photo: null,
    blood_type: "",
    // Section 2: Contact Info
    phone: "",
    whatsapp: "",
    email: "",
    home_address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    // Section 3: Employment Info
    staff_code: generateStaffCode(),
    hire_date: new Date().toISOString().split("T")[0],
    organization: "WS",
    department: "",
    job_title_en: "",
    job_title_dari: "",
    contract_type: "A",
    employment_status: "active",
    probation_end_date: "",
    direct_supervisor_id: "",
    // Section 4: Salary Setup
    rank_level: "",
    base_salary: "",
    housing_allowance: "",
    transport_allowance: "",
    family_allowance: "",
    // Section 5: Documents
    cv_upload: null,
    tazkira_scan: null,
    certificates: null,
    signed_contract: null,
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Auto-calculate total salary
  const totalSalary =
    (parseFloat(formData.base_salary) || 0) +
    (parseFloat(formData.housing_allowance) || 0) +
    (parseFloat(formData.transport_allowance) || 0) +
    (parseFloat(formData.family_allowance) || 0);

  useEffect(() => {
    if (isEdit) {
      // Demo: simulate loading
      setLoading(true);
      setTimeout(() => setLoading(false), 500);
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
      if (name === "profile_photo") {
        const reader = new FileReader();
        reader.onloadend = () => setPhotoPreview(reader.result);
        reader.readAsDataURL(files[0]);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    // Demo: simulate save
    setTimeout(() => {
      setSaving(false);
      Swal.fire("Success", isEdit ? "Staff updated successfully" : "Staff created successfully", "success");
      navigate("/hr/staff");
    }, 1000);
  };

  const getFieldError = (fieldName) => errors[fieldName]?.[0];
  const inputClass = (fieldName) => {
    const base =
      "w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:outline-none text-xs transition-all";
    return `${base} ${getFieldError(fieldName) ? "border-red-400 focus:ring-red-300 bg-red-50" : "border-gray-200 focus:ring-teal-400 hover:border-gray-300"}`;
  };

  const organizationOptions = [
    { value: "WS", label: "WS", color: "bg-teal-50 text-teal-700 border-teal-200" },
    { value: "WLS", label: "WLS", color: "bg-blue-50 text-blue-700 border-blue-200" },
    { value: "WISAL", label: "WISAL", color: "bg-purple-50 text-purple-700 border-purple-200" },
  ];

  const contractTypeOptions = [
    { value: "A", label: "Type A", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { value: "B", label: "Type B", color: "bg-blue-50 text-blue-700 border-blue-200" },
    { value: "C", label: "Type C", color: "bg-amber-50 text-amber-700 border-amber-200" },
  ];

  const employmentStatusOptions = [
    { value: "active", label: "Active", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { value: "probation", label: "Probation", color: "bg-amber-50 text-amber-700 border-amber-200" },
    { value: "suspended", label: "Suspended", color: "bg-red-50 text-red-700 border-red-200" },
    { value: "inactive", label: "Inactive", color: "bg-gray-100 text-gray-700 border-gray-200" },
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-teal-100 border-t-teal-600"></div>
          <span className="text-gray-500 text-sm">Loading staff data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/hr/staff")}
          className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-bold text-gray-800">
            {isEdit ? "Edit Staff" : "Register New Staff"}
          </h2>
          <p className="text-[11px] text-gray-400">
            Fill in the details below to {isEdit ? "update" : "register"} a staff member
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8 px-2 overflow-x-auto">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setCurrentStep(step.id)}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                currentStep === step.id
                  ? "bg-teal-600 text-white shadow-md shadow-teal-200"
                  : currentStep > step.id
                    ? "bg-teal-50 text-teal-700"
                    : "bg-gray-50 text-gray-400"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  currentStep === step.id
                    ? "bg-white/20"
                    : currentStep > step.id
                      ? "bg-teal-100"
                      : "bg-gray-100"
                }`}
              >
                {currentStep > step.id ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.id
                )}
              </div>
              <span className="text-[11px] font-semibold hidden lg:block">{step.title}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1.5 rounded-full min-w-[12px] ${currentStep > step.id ? "bg-teal-300" : "bg-gray-100"}`} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Personal Info */}
        {currentStep === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-teal-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={steps[0].icon} />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Personal Information</h3>
                  <p className="text-[10px] text-gray-500">Basic personal identity details</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              {/* Profile Photo Upload */}
              <div className="flex items-center gap-5 mb-6 pb-5 border-b border-gray-100">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Profile Photo</label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-50 text-teal-700 rounded-lg text-[11px] font-semibold cursor-pointer hover:bg-teal-100 transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Upload Photo
                    <input type="file" name="profile_photo" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                  <p className="text-[9px] text-gray-400 mt-1">JPG, PNG - Max 2MB</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Full Name (English) *</label>
                  <input type="text" name="full_name_en" value={formData.full_name_en} onChange={handleChange} required placeholder="Enter full name in English" className={inputClass("full_name_en")} />
                  {getFieldError("full_name_en") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("full_name_en")}</p>}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Full Name (Dari) *</label>
                  <input type="text" name="full_name_dari" value={formData.full_name_dari} onChange={handleChange} required placeholder="نام کامل به دری" dir="rtl" className={inputClass("full_name_dari")} />
                  {getFieldError("full_name_dari") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("full_name_dari")}</p>}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Father's Name *</label>
                  <input type="text" name="father_name" value={formData.father_name} onChange={handleChange} required placeholder="Enter father's name" className={inputClass("father_name")} />
                  {getFieldError("father_name") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("father_name")}</p>}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Date of Birth *</label>
                  <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} required className={inputClass("date_of_birth")} />
                  {getFieldError("date_of_birth") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("date_of_birth")}</p>}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">National ID / Tazkira Number *</label>
                  <input type="text" name="national_id" value={formData.national_id} onChange={handleChange} required placeholder="e.g. 1401-0123-45678" className={inputClass("national_id")} />
                  {getFieldError("national_id") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("national_id")}</p>}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Blood Type</label>
                  <select name="blood_type" value={formData.blood_type} onChange={handleChange} className={inputClass("blood_type")}>
                    {BLOOD_TYPES.map((bt) => (
                      <option key={bt.value} value={bt.value}>{bt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Contact Info */}
        {currentStep === 2 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-teal-50 to-indigo-50 border-b border-teal-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={steps[1].icon} />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Contact Information</h3>
                  <p className="text-[10px] text-gray-500">Phone, email, and emergency contacts</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Phone Number *</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required placeholder="07X XXX XXXX" className={inputClass("phone")} />
                  {getFieldError("phone") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("phone")}</p>}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">WhatsApp Number</label>
                  <input type="tel" name="whatsapp" value={formData.whatsapp} onChange={handleChange} placeholder="07X XXX XXXX" className={inputClass("whatsapp")} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Email Address</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="example@wifaqschool.com" className={inputClass("email")} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Home Address *</label>
                  <textarea name="home_address" value={formData.home_address} onChange={handleChange} required rows={2} placeholder="Full home address..." className={`${inputClass("home_address")} resize-none`} />
                  {getFieldError("home_address") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("home_address")}</p>}
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Emergency Contact
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Emergency Contact Name *</label>
                    <input type="text" name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleChange} required placeholder="Contact person name" className={inputClass("emergency_contact_name")} />
                    {getFieldError("emergency_contact_name") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("emergency_contact_name")}</p>}
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Emergency Contact Phone *</label>
                    <input type="tel" name="emergency_contact_phone" value={formData.emergency_contact_phone} onChange={handleChange} required placeholder="07X XXX XXXX" className={inputClass("emergency_contact_phone")} />
                    {getFieldError("emergency_contact_phone") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("emergency_contact_phone")}</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Employment Info */}
        {currentStep === 3 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={steps[2].icon} />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Employment Information</h3>
                  <p className="text-[10px] text-gray-500">Job details, contract, and organization</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-5">
              {/* Staff Code - Auto generated */}
              <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl p-4 border border-teal-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-teal-600 uppercase tracking-wider">Staff Code (Auto Generated)</p>
                    <p className="text-lg font-bold text-teal-800 mt-0.5">{formData.staff_code}</p>
                    <p className="text-[9px] text-teal-500 mt-0.5">Format: WS-2026-001</p>
                  </div>
                  <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Hire Date *</label>
                  <input type="date" name="hire_date" value={formData.hire_date} onChange={handleChange} required className={inputClass("hire_date")} />
                  {getFieldError("hire_date") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("hire_date")}</p>}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Department *</label>
                  <select name="department" value={formData.department} onChange={handleChange} required className={inputClass("department")}>
                    {DEPARTMENTS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                  {getFieldError("department") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("department")}</p>}
                </div>
              </div>

              {/* Organization */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Organization / Entity *</label>
                <div className="flex gap-2">
                  {organizationOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, organization: opt.value }))}
                      className={`flex-1 px-3 py-2.5 rounded-lg text-[11px] font-semibold border transition-all ${
                        formData.organization === opt.value
                          ? `${opt.color} ring-2 ring-offset-1 ring-teal-400`
                          : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Job Title (English) *</label>
                  <input type="text" name="job_title_en" value={formData.job_title_en} onChange={handleChange} required placeholder="e.g. Senior Teacher" className={inputClass("job_title_en")} />
                  {getFieldError("job_title_en") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("job_title_en")}</p>}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Job Title (Dari)</label>
                  <input type="text" name="job_title_dari" value={formData.job_title_dari} onChange={handleChange} placeholder="عنوان وظیفه به دری" dir="rtl" className={inputClass("job_title_dari")} />
                </div>
              </div>

              {/* Contract Type */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Contract Type *</label>
                <div className="flex gap-2">
                  {contractTypeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, contract_type: opt.value }))}
                      className={`flex-1 px-3 py-2.5 rounded-lg text-[11px] font-semibold border transition-all ${
                        formData.contract_type === opt.value
                          ? `${opt.color} ring-2 ring-offset-1 ring-teal-400`
                          : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Employment Status */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Employment Status *</label>
                <div className="flex gap-2 flex-wrap">
                  {employmentStatusOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, employment_status: opt.value }))}
                      className={`flex-1 min-w-[80px] px-2 py-2.5 rounded-lg text-[11px] font-semibold border transition-all ${
                        formData.employment_status === opt.value
                          ? `${opt.color} ring-2 ring-offset-1 ring-teal-400`
                          : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {formData.employment_status === "probation" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Probation End Date *</label>
                    <input type="date" name="probation_end_date" value={formData.probation_end_date} onChange={handleChange} className={inputClass("probation_end_date")} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Direct Supervisor</label>
                  <select name="direct_supervisor_id" value={formData.direct_supervisor_id} onChange={handleChange} className={inputClass("direct_supervisor_id")}>
                    <option value="">Select Supervisor</option>
                    {DEMO_STAFF.map((s) => (
                      <option key={s.id} value={s.id}>{s.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Salary Setup */}
        {currentStep === 4 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-teal-50 to-pink-50 border-b border-teal-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={steps[3].icon} />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Salary Information</h3>
                  <p className="text-[10px] text-gray-500">Initial salary and allowance setup</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Rank Level *</label>
                  <select name="rank_level" value={formData.rank_level} onChange={handleChange} required className={inputClass("rank_level")}>
                    {RANK_LEVELS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  {getFieldError("rank_level") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("rank_level")}</p>}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Base Salary (AFN) *</label>
                  <input type="number" name="base_salary" value={formData.base_salary} onChange={handleChange} required placeholder="0" className={inputClass("base_salary")} />
                  {getFieldError("base_salary") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("base_salary")}</p>}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Allowances</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Housing Allowance (AFN)</label>
                    <input type="number" name="housing_allowance" value={formData.housing_allowance} onChange={handleChange} placeholder="0" className={inputClass("housing_allowance")} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Transport Allowance (AFN)</label>
                    <input type="number" name="transport_allowance" value={formData.transport_allowance} onChange={handleChange} placeholder="0" className={inputClass("transport_allowance")} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Family Allowance (AFN)</label>
                    <input type="number" name="family_allowance" value={formData.family_allowance} onChange={handleChange} placeholder="0" className={inputClass("family_allowance")} />
                  </div>
                </div>
              </div>

              {/* Total Salary Card */}
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl p-5 border border-teal-100 mt-2">
                <h4 className="text-xs font-bold text-teal-800 mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Salary Breakdown
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-teal-100">
                    <p className="text-[9px] font-bold text-teal-600 uppercase tracking-wider">Base Salary</p>
                    <p className="text-sm font-bold text-gray-800 mt-1">{(parseFloat(formData.base_salary) || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <p className="text-[9px] font-bold text-blue-500 uppercase tracking-wider">Housing</p>
                    <p className="text-sm font-bold text-blue-600 mt-1">+{(parseFloat(formData.housing_allowance) || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-purple-100">
                    <p className="text-[9px] font-bold text-purple-500 uppercase tracking-wider">Transport</p>
                    <p className="text-sm font-bold text-purple-600 mt-1">+{(parseFloat(formData.transport_allowance) || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-amber-100">
                    <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">Family</p>
                    <p className="text-sm font-bold text-amber-600 mt-1">+{(parseFloat(formData.family_allowance) || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-teal-600 rounded-lg p-3">
                    <p className="text-[9px] font-bold text-teal-100 uppercase tracking-wider">Total Package</p>
                    <p className="text-sm font-bold text-white mt-1">{totalSalary.toLocaleString()} AFN</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Documents Upload */}
        {currentStep === 5 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-teal-50 to-violet-50 border-b border-teal-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={steps[4].icon} />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Documents Upload</h3>
                  <p className="text-[10px] text-gray-500">Upload required documents and certificates</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {[
                { name: "cv_upload", label: "CV Upload", required: true, accept: ".pdf,.doc,.docx", desc: "PDF, DOC - Max 5MB" },
                { name: "tazkira_scan", label: "Tazkira / National ID Scan", required: true, accept: ".pdf,.jpg,.jpeg,.png", desc: "PDF, JPG, PNG - Max 5MB" },
                { name: "certificates", label: "Certificates", required: true, accept: ".pdf,.jpg,.jpeg,.png", desc: "PDF, JPG, PNG - Multiple files allowed" },
                { name: "signed_contract", label: "Signed Contract", required: false, accept: ".pdf", desc: "PDF - Optional during registration" },
              ].map((doc) => (
                <div key={doc.name} className="border border-gray-200 rounded-xl p-4 hover:border-teal-200 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData[doc.name] ? "bg-teal-100" : "bg-gray-100"}`}>
                        {formData[doc.name] ? (
                          <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-700">
                          {doc.label} {doc.required && <span className="text-red-400">*</span>}
                        </p>
                        {formData[doc.name] ? (
                          <p className="text-[10px] text-teal-600 font-medium">{formData[doc.name].name}</p>
                        ) : (
                          <p className="text-[10px] text-gray-400">{doc.desc}</p>
                        )}
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-50 text-teal-700 rounded-lg text-[11px] font-semibold cursor-pointer hover:bg-teal-100 transition-all">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      {formData[doc.name] ? "Change" : "Upload"}
                      <input type="file" name={doc.name} accept={doc.accept} onChange={handleFileChange} className="hidden" />
                    </label>
                  </div>
                </div>
              ))}

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-3">
                <div className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-[11px] font-semibold text-amber-800">Important Note</p>
                    <p className="text-[10px] text-amber-600 mt-0.5">Signed contract can be uploaded later. All other documents are required for completing the registration process.</p>
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
              currentStep === 1 ? navigate("/hr/staff") : setCurrentStep(currentStep - 1)
            }
            className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-all flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {currentStep === 1 ? "Cancel" : "Back"}
          </button>

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep + 1)}
              className="px-5 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 transition-all shadow-sm flex items-center gap-1.5"
            >
              Next
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isEdit ? "Update Staff" : "Register Staff"}
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
