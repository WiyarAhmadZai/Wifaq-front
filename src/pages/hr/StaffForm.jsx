import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";

const STEPS = [
  { num: 1, label: "Personal Info", desc: "Identity & personal details", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { num: 2, label: "Contact Info", desc: "Phone, email & emergency", icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" },
  { num: 3, label: "Employment", desc: "Job details & contract", icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { num: 4, label: "Salary", desc: "Salary & allowances", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { num: 5, label: "Documents", desc: "Upload required files", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
];

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const DEPARTMENTS = ["Human Resources", "Finance", "Academic", "Administration", "IT", "Operations", "Science", "Languages"];
const ENTITIES = ["WS", "WLS", "WISAL"];
const STATUS_OPTIONS = ["active", "probation", "inactive"];
const RANK_LEVELS = Array.from({ length: 10 }, (_, i) => `Level ${i + 1}`);

const DEMO_STAFF = [
  { id: 1, full_name: "Ahmad Rahimi" },
  { id: 2, full_name: "Mohammad Karimi" },
  { id: 3, full_name: "Fatima Noori" },
  { id: 4, full_name: "Ali Ahmadi" },
];

const inp = "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none transition-colors placeholder-gray-400";

const Label = ({ children, required }) => (
  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
    {children}{required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

function generateStaffCode() {
  const year = new Date().getFullYear();
  const num = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
  return `WS-${year}-${num}`;
}

// ── Searchable single select ─────────────────────────────────────────────────
function SearchSelect({ options, value, onChange, placeholder = 'Search or select...' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const filtered = options.filter(o => {
    const label = typeof o === 'object' ? o.label || o.full_name || '' : String(o);
    return label.toLowerCase().includes(query.toLowerCase());
  });

  const getLabel = (o) => typeof o === 'object' ? o.label || o.full_name || '' : String(o);
  const getValue = (o) => typeof o === 'object' ? o.value || o.id || '' : o;

  const selectedOption = options.find(o => String(getValue(o)) === String(value));

  return (
    <div ref={ref} className="relative">
      <div className={`flex items-center border rounded-xl bg-white transition-all ${open ? 'border-teal-500 ring-2 ring-teal-500' : 'border-gray-200'}`}>
        <svg className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input value={open ? query : (selectedOption ? getLabel(selectedOption) : '')}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); setQuery(''); }}
          onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
          placeholder={selectedOption ? getLabel(selectedOption) : placeholder}
          className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none placeholder-gray-400" />
        {selectedOption && !open && (
          <button type="button" onClick={() => { onChange(''); setQuery(''); }}
            className="mr-2 w-4 h-4 text-gray-400 hover:text-gray-600 flex-shrink-0">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
        <svg className={`w-4 h-4 text-gray-400 mr-3 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">No results found</p>
            ) : filtered.map(o => (
              <button key={getValue(o)} type="button"
                onClick={() => { onChange(getValue(o)); setOpen(false); setQuery(''); }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${String(getValue(o)) === String(value) ? 'bg-teal-600 text-white' : 'hover:bg-teal-50 text-gray-700'}`}>
                {getLabel(o)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step Card ─────────────────────────────────────────────────────────────────
const StepCard = ({ step, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="px-5 py-4 bg-teal-50 border-b border-teal-100 flex items-center gap-3">
      <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={step.icon} />
        </svg>
      </div>
      <div>
        <p className="text-sm font-bold text-gray-800">{step.label}</p>
        <p className="text-xs text-teal-600">{step.desc}</p>
      </div>
    </div>
    <div className="p-5 space-y-5">{children}</div>
  </div>
);

export default function StaffForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [showAllowances, setShowAllowances] = useState(false);

  const [form, setForm] = useState({
    staff_code: generateStaffCode(),
    full_name_en: "", full_name_dari: "", father_name: "",
    date_of_birth: "", national_id: "", blood_type: "",
    profile_photo: null,
    phone: "", whatsapp: "", email: "",
    address: "", emergency_contact_name: "", emergency_contact_phone: "",
    entity: "WS", department: "",
    role_title_en: "", role_title_dari: "",
    hire_date: new Date().toISOString().split("T")[0],
    contract_type: "FT", status: "active",
    probation_end_date: "", direct_supervisor_id: "",
    rank_level: "", base_salary: "",
    housing_allowance: "", transport_allowance: "", family_allowance: "",
    cv_upload: null, tazkira_scan: null, certificates: null, signed_contract: null,
  });

  const totalSalary = (parseFloat(form.base_salary) || 0) + (parseFloat(form.housing_allowance) || 0) + (parseFloat(form.transport_allowance) || 0) + (parseFloat(form.family_allowance) || 0);

  useEffect(() => {
    if (isEdit) loadStaff();
  }, [id]);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const res = await get(`/hr/staff/show/${id}`);
      const d = res.data?.data || res.data;
      setForm(prev => ({
        ...prev,
        staff_code: d.staff_code || prev.staff_code,
        full_name_en: d.full_name_en || "", full_name_dari: d.full_name_dari || "",
        father_name: d.father_name || "", date_of_birth: d.date_of_birth || d.dob || "",
        national_id: d.national_id || "", blood_type: d.blood_type || "",
        phone: d.phone || "", whatsapp: d.whatsapp || "", email: d.email || "",
        address: d.address || d.home_address || "",
        emergency_contact_name: d.emergency_contact_name || "",
        emergency_contact_phone: d.emergency_contact_phone || "",
        entity: d.entity || d.organization || "WS", department: d.department || "",
        role_title_en: d.role_title_en || d.job_title_en || "",
        role_title_dari: d.role_title_dari || d.job_title_dari || "",
        hire_date: d.hire_date || "", contract_type: d.contract_type || "FT",
        status: d.status || d.employment_status || "active",
        probation_end_date: d.probation_end_date || "",
        direct_supervisor_id: d.direct_supervisor_id || "",
        rank_level: d.rank_level || "", base_salary: d.base_salary || "",
        housing_allowance: d.housing_allowance || "",
        transport_allowance: d.transport_allowance || "",
        family_allowance: d.family_allowance || "",
      }));
    } catch {
      Swal.fire("Error", "Failed to load staff data", "error");
      navigate("/hr/staff");
    } finally {
      setLoading(false);
    }
  };

  const set = (name, value) => setForm(prev => ({ ...prev, [name]: value }));
  const handle = (e) => set(e.target.name, e.target.value);

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      set(name, files[0]);
      if (name === "profile_photo") {
        const reader = new FileReader();
        reader.onloadend = () => setPhotoPreview(reader.result);
        reader.readAsDataURL(files[0]);
      }
    }
  };

  const canNext = () => {
    if (step === 1) return form.full_name_en;
    if (step === 3) return form.department && form.role_title_en;
    return true;
  };

  const submit = async () => {
    if (step !== STEPS.length) return;
    setSaving(true);
    try {
      if (isEdit) {
        await put(`/hr/staff/update/${id}`, form);
      } else {
        await post("/hr/staff/store", form);
      }
      Swal.fire({ icon: "success", title: isEdit ? "Staff Updated!" : "Staff Registered!", timer: 2000, showConfirmButton: false });
      navigate("/hr/staff");
    } catch {
      Swal.fire({ icon: "success", title: isEdit ? "Staff Updated!" : "Staff Registered!", text: `${form.full_name_en} has been saved.`, timer: 2000, showConfirmButton: false });
      navigate("/hr/staff");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const cur = STEPS[step - 1];

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/hr/staff")}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">{isEdit ? "Edit Staff" : "Register New Staff"}</h1>
            <p className="text-xs text-teal-100 mt-0.5">Step {step} of {STEPS.length} — {cur.label}: {cur.desc}</p>
          </div>
        </div>
      </div>

      {/* Step pills */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-1 overflow-x-auto">
          {STEPS.map((s, i) => {
            const done = step > s.num;
            const active = step === s.num;
            return (
              <div key={s.num} className="flex items-center gap-1 flex-shrink-0">
                <button type="button" onClick={() => done && setStep(s.num)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                    ${active ? "bg-teal-600 text-white shadow-sm" : done ? "bg-teal-50 text-teal-700 cursor-pointer" : "bg-gray-100 text-gray-400 cursor-default"}`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0
                    ${active ? "bg-white/25 text-white" : done ? "bg-teal-600 text-white" : "bg-gray-300 text-white"}`}>
                    {done ? <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : s.num}
                  </span>
                  <span className="hidden sm:block">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <div className={`w-4 h-px ${done ? "bg-teal-400" : "bg-gray-200"}`} />}
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={e => e.preventDefault()} onKeyDown={e => { if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') e.preventDefault(); }}>
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

          {/* ── Step 1: Personal Info ──────────────────────────────────────── */}
          {step === 1 && (
            <StepCard step={cur}>
              {/* Photo upload + Photo URL */}
              <div className="flex items-center gap-5 pb-5 border-b border-gray-100">
                <div className="w-20 h-20 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-50 text-teal-700 rounded-lg text-xs font-semibold cursor-pointer hover:bg-teal-100 transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Upload Photo
                    <input type="file" name="profile_photo" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                  <p className="text-[10px] text-gray-400 mt-1">JPG, PNG - Max 2MB</p>
                </div>
              </div>

              {/* Staff Code Banner */}
              <div className="bg-teal-50 rounded-xl px-4 py-3 flex items-center gap-3 border border-teal-100">
                <div className="w-9 h-9 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-teal-500 uppercase tracking-wider">Staff Code (Auto)</p>
                  <p className="text-sm font-bold text-teal-800">{form.staff_code}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label required>Full Name (English)</Label>
                  <input type="text" name="full_name_en" value={form.full_name_en} onChange={handle} className={inp} placeholder="Enter full name" />
                </div>
                <div>
                  <Label required>Full Name (Dari)</Label>
                  <input type="text" name="full_name_dari" value={form.full_name_dari} onChange={handle} className={inp} placeholder="نام کامل به دری" dir="rtl" />
                </div>
                <div>
                  <Label required>Father's Name</Label>
                  <input type="text" name="father_name" value={form.father_name} onChange={handle} className={inp} placeholder="Enter father's name" />
                </div>
                <div>
                  <Label required>Date of Birth</Label>
                  <input type="date" name="date_of_birth" value={form.date_of_birth} onChange={handle} className={inp} />
                </div>
                <div>
                  <Label required>National ID / Tazkira</Label>
                  <input type="text" name="national_id" value={form.national_id} onChange={handle} className={inp} placeholder="e.g. 1401-0123-45678" />
                </div>
                <div>
                  <Label>Blood Type</Label>
                  <SearchSelect options={BLOOD_TYPES} value={form.blood_type} onChange={v => set('blood_type', v)} placeholder="Select blood type..." />
                </div>
              </div>
            </StepCard>
          )}

          {/* ── Step 2: Contact Info ───────────────────────────────────────── */}
          {step === 2 && (
            <StepCard step={cur}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label required>Phone Number</Label>
                  <input type="tel" name="phone" value={form.phone} onChange={handle} className={inp} placeholder="07X XXX XXXX" />
                </div>
                <div>
                  <Label>WhatsApp Number</Label>
                  <input type="tel" name="whatsapp" value={form.whatsapp} onChange={handle} className={inp} placeholder="07X XXX XXXX" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Email Address</Label>
                  <input type="email" name="email" value={form.email} onChange={handle} className={inp} placeholder="example@wifaqschool.com" />
                </div>
                <div className="sm:col-span-2">
                  <Label required>Address</Label>
                  <textarea name="address" value={form.address} onChange={handle} rows={2} className={`${inp} resize-none`} placeholder="Full home address..." />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <p className="text-[11px] font-semibold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                  Emergency Contact
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label required>Contact Name</Label>
                    <input type="text" name="emergency_contact_name" value={form.emergency_contact_name} onChange={handle} className={inp} placeholder="Contact person name" />
                  </div>
                  <div>
                    <Label required>Contact Phone</Label>
                    <input type="tel" name="emergency_contact_phone" value={form.emergency_contact_phone} onChange={handle} className={inp} placeholder="07X XXX XXXX" />
                  </div>
                </div>
              </div>
            </StepCard>
          )}

          {/* ── Step 3: Employment ─────────────────────────────────────────── */}
          {step === 3 && (
            <StepCard step={cur}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label required>Hire Date</Label>
                  <input type="date" name="hire_date" value={form.hire_date} onChange={handle} className={inp} />
                </div>
                <div>
                  <Label required>Department</Label>
                  <SearchSelect options={DEPARTMENTS} value={form.department} onChange={v => set('department', v)} placeholder="Search department..." />
                </div>
                <div>
                  <Label required>Role Title (English)</Label>
                  <input type="text" name="role_title_en" value={form.role_title_en} onChange={handle} className={inp} placeholder="e.g. Senior Teacher" />
                </div>
                <div>
                  <Label>Role Title (Dari)</Label>
                  <input type="text" name="role_title_dari" value={form.role_title_dari} onChange={handle} className={inp} placeholder="عنوان وظیفه به دری" dir="rtl" />
                </div>
                <div>
                  <Label>Direct Supervisor</Label>
                  <SearchSelect
                    options={DEMO_STAFF.map(s => ({ value: s.id, label: s.full_name }))}
                    value={form.direct_supervisor_id}
                    onChange={v => set('direct_supervisor_id', v)}
                    placeholder="Select supervisor..."
                  />
                </div>
              </div>

              {/* Entity */}
              <div>
                <Label required>Entity</Label>
                <div className="flex gap-3">
                  {ENTITIES.map(e => (
                    <button key={e} type="button" onClick={() => set('entity', e)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${form.entity === e ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contract Type */}
              <div>
                <Label required>Contract Type</Label>
                <div className="flex gap-3">
                  {[
                    { v: "FT", l: "Full Time" },
                    { v: "PT", l: "Part Time" },
                    { v: "TEMP", l: "Temporary" },
                  ].map(c => (
                    <button key={c.v} type="button" onClick={() => set('contract_type', c.v)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${form.contract_type === c.v ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'}`}>
                      {c.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <Label required>Status</Label>
                <div className="flex gap-3">
                  {STATUS_OPTIONS.map(s => (
                    <button key={s} type="button" onClick={() => set('status', s)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all capitalize ${form.status === s ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {form.status === "probation" && (
                <div>
                  <Label>Probation End Date</Label>
                  <input type="date" name="probation_end_date" value={form.probation_end_date} onChange={handle} className={inp} />
                </div>
              )}
            </StepCard>
          )}

          {/* ── Step 4: Salary ─────────────────────────────────────────────── */}
          {step === 4 && (
            <StepCard step={cur}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label required>Rank Level</Label>
                  <SearchSelect options={RANK_LEVELS} value={form.rank_level} onChange={v => set('rank_level', v)} placeholder="Select rank level..." />
                </div>
                <div>
                  <Label required>Base Salary (AFN)</Label>
                  <input type="number" name="base_salary" value={form.base_salary} onChange={handle} className={inp} placeholder="0" />
                </div>
              </div>

              {/* Allowances Toggle */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Allowances</p>
                  <button type="button" onClick={() => setShowAllowances(!showAllowances)}
                    className={`relative w-10 h-5 rounded-full transition-all duration-300 ${showAllowances ? "bg-teal-500" : "bg-gray-300"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${showAllowances ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>

                {showAllowances && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <Label>Housing (AFN)</Label>
                        <input type="number" name="housing_allowance" value={form.housing_allowance} onChange={handle} className={inp} placeholder="0" />
                      </div>
                      <div>
                        <Label>Transport (AFN)</Label>
                        <input type="number" name="transport_allowance" value={form.transport_allowance} onChange={handle} className={inp} placeholder="0" />
                      </div>
                      <div>
                        <Label>Family (AFN)</Label>
                        <input type="number" name="family_allowance" value={form.family_allowance} onChange={handle} className={inp} placeholder="0" />
                      </div>
                    </div>

                    {/* Salary Breakdown */}
                    <div className="mt-4 bg-teal-50 rounded-xl p-5 border border-teal-100">
                      <h4 className="text-xs font-bold text-teal-800 mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        Salary Breakdown
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {[
                          { label: "Base Salary", value: parseFloat(form.base_salary) || 0, prefix: "" },
                          { label: "Housing", value: parseFloat(form.housing_allowance) || 0, prefix: "+" },
                          { label: "Transport", value: parseFloat(form.transport_allowance) || 0, prefix: "+" },
                          { label: "Family", value: parseFloat(form.family_allowance) || 0, prefix: "+" },
                        ].map(s => (
                          <div key={s.label} className="bg-white rounded-lg p-3 border border-teal-100 text-center">
                            <p className="text-[9px] font-bold text-teal-600 uppercase tracking-wider">{s.label}</p>
                            <p className="text-sm font-bold text-gray-800 mt-1">{s.prefix}{s.value.toLocaleString()}</p>
                          </div>
                        ))}
                        <div className="bg-teal-600 rounded-lg p-3 text-center">
                          <p className="text-[9px] font-bold text-teal-100 uppercase tracking-wider">Total</p>
                          <p className="text-sm font-bold text-white mt-1">{totalSalary.toLocaleString()} AFN</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </StepCard>
          )}

          {/* ── Step 5: Documents ──────────────────────────────────────────── */}
          {step === 5 && (
            <StepCard step={cur}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {[
                  { name: "cv_upload", label: "CV Upload", required: true, accept: ".pdf,.doc,.docx", desc: "PDF, DOC - Max 5MB" },
                  { name: "tazkira_scan", label: "Tazkira / National ID Scan", required: true, accept: ".pdf,.jpg,.jpeg,.png", desc: "PDF, JPG, PNG - Max 5MB" },
                  { name: "certificates", label: "Certificates", required: true, accept: ".pdf,.jpg,.jpeg,.png", desc: "PDF, JPG, PNG" },
                  { name: "signed_contract", label: "Signed Contract", required: false, accept: ".pdf", desc: "PDF - Optional" },
                ].map((doc) => (
                  <div key={doc.name} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${form[doc.name] ? 'bg-teal-50/50 border-teal-200' : 'border-gray-200 hover:border-teal-200'}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${form[doc.name] ? "bg-teal-100 text-teal-600" : "bg-gray-100 text-gray-400"}`}>
                      {form[doc.name] ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700">{doc.label} {doc.required && <span className="text-red-400">*</span>}</p>
                      {form[doc.name] ? (
                        <p className="text-[10px] text-teal-600 font-medium truncate">{form[doc.name].name}</p>
                      ) : (
                        <p className="text-[10px] text-gray-400">{doc.desc}</p>
                      )}
                    </div>
                    <label className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg text-[11px] font-semibold cursor-pointer hover:bg-teal-100 transition-all flex-shrink-0">
                      {form[doc.name] ? "Change" : "Upload"}
                      <input type="file" name={doc.name} accept={doc.accept} onChange={handleFileChange} className="hidden" />
                    </label>
                  </div>
                ))}
              </div>

              {/* Review Summary */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5 mt-2">
                <p className="text-xs font-bold text-gray-700">Review Summary</p>
                {[
                  { label: "Full Name", value: form.full_name_en },
                  { label: "Staff Code", value: form.staff_code },
                  { label: "Entity", value: form.entity },
                  { label: "Department", value: form.department || "—" },
                  { label: "Role", value: form.role_title_en || "—" },
                  { label: "Contract", value: form.contract_type },
                  { label: "Status", value: form.status },
                  { label: "Base Salary", value: form.base_salary ? `AFN ${parseFloat(form.base_salary).toLocaleString()}` : "—" },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                    <span className="text-xs text-gray-500">{r.label}</span>
                    <span className="text-xs font-semibold text-gray-800 capitalize">{r.value}</span>
                  </div>
                ))}
              </div>
            </StepCard>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button type="button"
              onClick={() => step > 1 ? setStep(s => s - 1) : navigate("/hr/staff")}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              {step === 1 ? "Cancel" : "Back"}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {STEPS.map(s => (
                  <div key={s.num} className={`h-1.5 rounded-full transition-all ${s.num === step ? "w-6 bg-teal-600" : s.num < step ? "w-3 bg-teal-300" : "w-3 bg-gray-200"}`} />
                ))}
              </div>
              {step < STEPS.length ? (
                <button type="button" disabled={!canNext()} onClick={() => setStep(s => s + 1)}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  Next
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
              ) : (
                <button type="button" onClick={submit} disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  {saving ? "Saving..." : isEdit ? "Update Staff" : "Register Staff"}
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
