import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";

const steps = [
  { id: 1, title: "Personal Info", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { id: 2, title: "Contact Info", icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" },
  { id: 3, title: "Employment", icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { id: 4, title: "Salary", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { id: 5, title: "Documents", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
];

const BLOOD_TYPES = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const DEPARTMENTS = [
  { value: "", label: "Select Department" },
  { value: "hr", label: "Human Resources" },
  { value: "finance", label: "Finance" },
  { value: "academic", label: "Academic" },
  { value: "admin", label: "Administration" },
  { value: "it", label: "IT" },
  { value: "operations", label: "Operations" },
];
const RANK_LEVELS = Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: `Level ${i + 1}` }));

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
    full_name_en: "", full_name_dari: "", father_name: "", date_of_birth: "", national_id: "", profile_photo: null, blood_type: "",
    phone: "", whatsapp: "", email: "", home_address: "", emergency_contact_name: "", emergency_contact_phone: "",
    staff_code: generateStaffCode(), hire_date: new Date().toISOString().split("T")[0], organization: "WS", department: "", job_title_en: "", job_title_dari: "", contract_type: "A", employment_status: "active", probation_end_date: "", direct_supervisor_id: "",
    rank_level: "", base_salary: "", housing_allowance: "", transport_allowance: "", family_allowance: "",
    cv_upload: null, tazkira_scan: null, certificates: null, signed_contract: null,
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);

  const totalSalary = (parseFloat(formData.base_salary) || 0) + (parseFloat(formData.housing_allowance) || 0) + (parseFloat(formData.transport_allowance) || 0) + (parseFloat(formData.family_allowance) || 0);

  useEffect(() => { if (isEdit) { setLoading(true); setTimeout(() => setLoading(false), 500); } }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
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
    setTimeout(() => {
      setSaving(false);
      Swal.fire("Success", isEdit ? "Staff updated" : "Staff registered", "success");
      navigate("/hr/staff");
    }, 1000);
  };

  const err = (f) => errors[f]?.[0];
  const ic = (f) => `w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:outline-none text-xs transition-all ${err(f) ? "border-red-300 focus:ring-red-300 bg-red-50" : "border-gray-200 focus:ring-teal-400 hover:border-gray-300 bg-white"}`;

  const OptionButtons = ({ options, name, value }) => (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setFormData((prev) => ({ ...prev, [name]: opt.value }))}
          className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
            value === opt.value ? `${opt.color} ring-2 ring-offset-1 ring-teal-400` : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
          }`}
        >{opt.label}</button>
      ))}
    </div>
  );

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-teal-100 border-t-teal-600"></div>
        <span className="text-gray-500 text-sm">Loading staff data...</span>
      </div>
    </div>
  );

  return (
    <div className="px-4 py-4 mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate("/hr/staff")} className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <div>
          <h2 className="text-lg font-bold text-gray-800">{isEdit ? "Edit Staff" : "Register New Staff"}</h2>
          <p className="text-xs text-gray-400">Step {currentStep} of {steps.length} — {steps[currentStep - 1].title}</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center mb-6 px-1">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setCurrentStep(step.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
                currentStep === step.id ? "bg-teal-600 text-white shadow-md shadow-teal-200" : currentStep > step.id ? "bg-teal-50 text-teal-700" : "bg-gray-50 text-gray-400"
              }`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                currentStep === step.id ? "bg-white/20" : currentStep > step.id ? "bg-teal-100" : "bg-gray-100"
              }`}>
                {currentStep > step.id ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                ) : step.id}
              </div>
              <span className="text-[11px] font-semibold hidden sm:block">{step.title}</span>
            </button>
            {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-2 rounded-full ${currentStep > step.id ? "bg-teal-300" : "bg-gray-100"}`} />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Personal Info */}
        {currentStep === 1 && (
          <StepCard step={steps[0]} gradient="from-teal-50 to-emerald-50" subtitle="Basic personal identity details">
            {/* Photo upload */}
            <div className="flex items-center gap-5 mb-5 pb-5 border-b border-gray-100">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Profile Photo</label>
                <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-50 text-teal-700 rounded-lg text-xs font-semibold cursor-pointer hover:bg-teal-100 transition-all">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Upload Photo
                  <input type="file" name="profile_photo" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
                <p className="text-[10px] text-gray-400 mt-1">JPG, PNG - Max 2MB</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField label="Full Name (English)" name="full_name_en" value={formData.full_name_en} onChange={handleChange} required placeholder="Enter full name" error={err("full_name_en")} ic={ic} />
              <InputField label="Full Name (Dari)" name="full_name_dari" value={formData.full_name_dari} onChange={handleChange} required placeholder="نام کامل به دری" dir="rtl" error={err("full_name_dari")} ic={ic} />
              <InputField label="Father's Name" name="father_name" value={formData.father_name} onChange={handleChange} required placeholder="Enter father's name" error={err("father_name")} ic={ic} />
              <InputField label="Date of Birth" name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleChange} required error={err("date_of_birth")} ic={ic} />
              <InputField label="National ID / Tazkira Number" name="national_id" value={formData.national_id} onChange={handleChange} required placeholder="e.g. 1401-0123-45678" error={err("national_id")} ic={ic} />
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Blood Type</label>
                <select name="blood_type" value={formData.blood_type} onChange={handleChange} className={ic("blood_type")}>
                  <option value="">Select Blood Type</option>
                  {BLOOD_TYPES.filter(Boolean).map((bt) => <option key={bt} value={bt}>{bt}</option>)}
                </select>
              </div>
            </div>
          </StepCard>
        )}

        {/* Step 2: Contact Info */}
        {currentStep === 2 && (
          <StepCard step={steps[1]} gradient="from-teal-50 to-indigo-50" subtitle="Phone, email, and emergency contacts">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField label="Phone Number" name="phone" type="tel" value={formData.phone} onChange={handleChange} required placeholder="07X XXX XXXX" error={err("phone")} ic={ic} />
              <InputField label="WhatsApp Number" name="whatsapp" type="tel" value={formData.whatsapp} onChange={handleChange} placeholder="07X XXX XXXX" ic={ic} />
              <div className="sm:col-span-2">
                <InputField label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="example@wifaqschool.com" ic={ic} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Home Address *</label>
                <textarea name="home_address" value={formData.home_address} onChange={handleChange} required rows={2} placeholder="Full home address..." className={`${ic("home_address")} resize-none`} />
                {err("home_address") && <p className="text-red-500 text-[10px] mt-1">{err("home_address")}</p>}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-[11px] font-semibold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                Emergency Contact
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Contact Name" name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleChange} required placeholder="Contact person name" error={err("emergency_contact_name")} ic={ic} />
                <InputField label="Contact Phone" name="emergency_contact_phone" type="tel" value={formData.emergency_contact_phone} onChange={handleChange} required placeholder="07X XXX XXXX" error={err("emergency_contact_phone")} ic={ic} />
              </div>
            </div>
          </StepCard>
        )}

        {/* Step 3: Employment Info */}
        {currentStep === 3 && (
          <StepCard step={steps[2]} gradient="from-teal-50 to-cyan-50" subtitle="Job details, contract, and organization">
            {/* Staff Code */}
            <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl p-4 mb-4 flex items-center justify-between border border-teal-100">
              <div>
                <p className="text-[10px] font-semibold text-teal-600 uppercase tracking-wider">Staff Code (Auto Generated)</p>
                <p className="text-lg font-bold text-teal-800 mt-0.5">{formData.staff_code}</p>
                <p className="text-[10px] text-teal-500 mt-0.5">Format: WS-2026-001</p>
              </div>
              <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField label="Hire Date" name="hire_date" type="date" value={formData.hire_date} onChange={handleChange} required error={err("hire_date")} ic={ic} />
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Department *</label>
                <select name="department" value={formData.department} onChange={handleChange} required className={ic("department")}>
                  {DEPARTMENTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
                {err("department") && <p className="text-red-500 text-[10px] mt-1">{err("department")}</p>}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Organization / Entity *</label>
              <OptionButtons name="organization" value={formData.organization} options={[
                { value: "WS", label: "WS", color: "bg-teal-50 text-teal-700 border-teal-200" },
                { value: "WLS", label: "WLS", color: "bg-blue-50 text-blue-700 border-blue-200" },
                { value: "WISAL", label: "WISAL", color: "bg-purple-50 text-purple-700 border-purple-200" },
              ]} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <InputField label="Job Title (English)" name="job_title_en" value={formData.job_title_en} onChange={handleChange} required placeholder="e.g. Senior Teacher" error={err("job_title_en")} ic={ic} />
              <InputField label="Job Title (Dari)" name="job_title_dari" value={formData.job_title_dari} onChange={handleChange} placeholder="عنوان وظیفه به دری" dir="rtl" ic={ic} />
            </div>

            <div className="mt-4">
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Contract Type *</label>
              <OptionButtons name="contract_type" value={formData.contract_type} options={[
                { value: "A", label: "Type A", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                { value: "B", label: "Type B", color: "bg-blue-50 text-blue-700 border-blue-200" },
                { value: "C", label: "Type C", color: "bg-amber-50 text-amber-700 border-amber-200" },
              ]} />
            </div>

            <div className="mt-4">
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Employment Status *</label>
              <OptionButtons name="employment_status" value={formData.employment_status} options={[
                { value: "active", label: "Active", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                { value: "probation", label: "Probation", color: "bg-amber-50 text-amber-700 border-amber-200" },
                { value: "suspended", label: "Suspended", color: "bg-red-50 text-red-700 border-red-200" },
                { value: "inactive", label: "Inactive", color: "bg-gray-100 text-gray-600 border-gray-200" },
              ]} />
            </div>

            {formData.employment_status === "probation" && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Probation End Date" name="probation_end_date" type="date" value={formData.probation_end_date} onChange={handleChange} ic={ic} />
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Direct Supervisor</label>
                <select name="direct_supervisor_id" value={formData.direct_supervisor_id} onChange={handleChange} className={ic("direct_supervisor_id")}>
                  <option value="">Select Supervisor</option>
                  {DEMO_STAFF.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>
            </div>
          </StepCard>
        )}

        {/* Step 4: Salary */}
        {currentStep === 4 && (
          <StepCard step={steps[3]} gradient="from-teal-50 to-pink-50" subtitle="Initial salary and allowance setup">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Rank Level *</label>
                <select name="rank_level" value={formData.rank_level} onChange={handleChange} required className={ic("rank_level")}>
                  <option value="">Select Rank Level</option>
                  {RANK_LEVELS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <InputField label="Base Salary (AFN)" name="base_salary" type="number" value={formData.base_salary} onChange={handleChange} required placeholder="0" error={err("base_salary")} ic={ic} />
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Allowances</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <InputField label="Housing Allowance (AFN)" name="housing_allowance" type="number" value={formData.housing_allowance} onChange={handleChange} placeholder="0" ic={ic} />
                <InputField label="Transport Allowance (AFN)" name="transport_allowance" type="number" value={formData.transport_allowance} onChange={handleChange} placeholder="0" ic={ic} />
                <InputField label="Family Allowance (AFN)" name="family_allowance" type="number" value={formData.family_allowance} onChange={handleChange} placeholder="0" ic={ic} />
              </div>
            </div>

            {/* Salary Breakdown */}
            <div className="mt-4 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl p-5 border border-teal-100">
              <h4 className="text-xs font-bold text-teal-800 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
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
          </StepCard>
        )}

        {/* Step 5: Documents */}
        {currentStep === 5 && (
          <StepCard step={steps[4]} gradient="from-teal-50 to-violet-50" subtitle="Upload required documents and certificates">
            <div className="space-y-3">
              {[
                { name: "cv_upload", label: "CV Upload", required: true, accept: ".pdf,.doc,.docx", desc: "PDF, DOC - Max 5MB" },
                { name: "tazkira_scan", label: "Tazkira / National ID Scan", required: true, accept: ".pdf,.jpg,.jpeg,.png", desc: "PDF, JPG, PNG - Max 5MB" },
                { name: "certificates", label: "Certificates", required: true, accept: ".pdf,.jpg,.jpeg,.png", desc: "PDF, JPG, PNG - Multiple files allowed" },
                { name: "signed_contract", label: "Signed Contract", required: false, accept: ".pdf", desc: "PDF - Optional during registration" },
              ].map((doc) => (
                <div key={doc.name} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${formData[doc.name] ? 'bg-teal-50/50 border-teal-200' : 'border-gray-200 hover:border-teal-200'}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${formData[doc.name] ? "bg-teal-100 text-teal-600" : "bg-gray-100 text-gray-400"}`}>
                    {formData[doc.name] ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-700">{doc.label} {doc.required && <span className="text-red-400">*</span>}</p>
                    {formData[doc.name] ? (
                      <p className="text-[10px] text-teal-600 font-medium truncate">{formData[doc.name].name}</p>
                    ) : (
                      <p className="text-[10px] text-gray-400">{doc.desc}</p>
                    )}
                  </div>
                  <label className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg text-[11px] font-semibold cursor-pointer hover:bg-teal-100 transition-all flex-shrink-0">
                    {formData[doc.name] ? "Change" : "Upload"}
                    <input type="file" name={doc.name} accept={doc.accept} onChange={handleFileChange} className="hidden" />
                  </label>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4 flex items-start gap-2.5">
              <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div>
                <p className="text-[11px] font-semibold text-amber-800">Important Note</p>
                <p className="text-[10px] text-amber-600 mt-0.5">Signed contract can be uploaded later. All other documents are required for completing the registration process.</p>
              </div>
            </div>
          </StepCard>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6">
          <button type="button" onClick={() => currentStep === 1 ? navigate("/hr/staff") : setCurrentStep(currentStep - 1)}
            className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-all flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            {currentStep === 1 ? "Cancel" : "Back"}
          </button>

          {currentStep < 5 ? (
            <button type="button" onClick={() => setCurrentStep(currentStep + 1)}
              className="px-5 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 transition-all shadow-sm flex items-center gap-1.5">
              Next
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          ) : (
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2">
              {saving ? (
                <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Saving...</>
              ) : (
                <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{isEdit ? "Update Staff" : "Register Staff"}</>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function StepCard({ step, gradient, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className={`px-5 py-4 bg-gradient-to-r ${gradient} border-b border-teal-100`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={step.icon} /></svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800">{step.title}</h3>
            <p className="text-[10px] text-gray-500">{subtitle}</p>
          </div>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InputField({ label, name, type = "text", value, onChange, required, placeholder, error, ic, dir }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">{label} {required && '*'}</label>
      <input type={type} name={name} value={value} onChange={onChange} required={required} placeholder={placeholder} dir={dir} className={ic(name)} />
      {error && <p className="text-red-500 text-[10px] mt-1">{error}</p>}
    </div>
  );
}
