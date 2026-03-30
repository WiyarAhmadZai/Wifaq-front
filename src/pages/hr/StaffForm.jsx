import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, API_BASE_URL } from "../../api/axios";
import Swal from "sweetalert2";

const STEPS = [
  { num: 1, label: "Select Applicant", desc: "Choose hired applicant", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  { num: 2, label: "Staff Details", desc: "Additional identity info", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { num: 3, label: "Employment", desc: "Branch & probation", icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { num: 4, label: "Review", desc: "Confirm & register", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
];

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const CONTRACT_LABELS = { full_time: "Full Time", part_time: "Part Time", contract: "Contract", temporary: "Temporary", internship: "Internship", FT: "Full Time", PT: "Part Time", TEMP: "Temporary", CONTRACT: "Contract", INTERNSHIP: "Internship" };

const DOCUMENT_TYPES = { cv_resume: "CV/Resume", identity_document: "Identity Document", educational_document: "Educational Document", work_samples: "Work Samples" };

const inp = "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none transition-colors placeholder-gray-400";

const Label = ({ children, required }) => (
  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
    {children}{required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

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
        <div className="absolute z-[999] w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
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

const StepCard = ({ step, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
    <div className="px-5 py-4 bg-teal-50 border-b border-teal-100 rounded-t-2xl flex items-center gap-3">
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

  const [step, setStep] = useState(isEdit ? 2 : 1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const [hiredApplicants, setHiredApplicants] = useState([]);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [branches, setBranches] = useState([]);

  const [form, setForm] = useState({
    application_id: "",
    father_name: "", blood_type: "",
    profile_photo: null,
    emergency_contact_name: "", emergency_contact_phone: "",
    branch_id: "", department: "",
    role_title_en: "", status: "active",
    has_probation: false, probation_end_date: "",
  });

  useEffect(() => {
    fetchHiredApplicants();
    fetchBranches();
    if (isEdit) loadStaff();
  }, [id]);

  const fetchHiredApplicants = async () => {
    try { const res = await get('/hr/staff/hired-applicants/list'); setHiredApplicants(res.data?.data || []); } catch { setHiredApplicants([]); }
  };

  const fetchBranches = async () => {
    try { const res = await get('/branches/list'); setBranches(res.data?.data || res.data || []); } catch { setBranches([]); }
  };

  const loadStaff = async () => {
    setLoading(true);
    try {
      const res = await get(`/hr/staff/show/${id}`);
      const d = res.data?.data || res.data;
      setForm(prev => ({
        ...prev,
        application_id: d.application_id || "",
        father_name: d.father_name || "",
        blood_type: d.blood_type || "",
        emergency_contact_name: d.emergency_contact_name || "",
        emergency_contact_phone: d.emergency_contact_phone || "",
        branch_id: d.branch_id || "", department: d.department || "",
        role_title_en: d.role_title_en || "",
        status: d.status || "active",
        has_probation: d.has_probation || false,
        probation_end_date: d.probation_end_date?.split("T")[0] || "",
      }));
      if (d.profile_photo) {
        setPhotoPreview(`${API_BASE_URL.replace(/\/api\/?$/, '')}/storage/${d.profile_photo}`);
      }
      if (d.application) {
        setSelectedApplicant({
          ...d.application,
          position: d.application.job_posting?.requisition?.position_title || d.application.job_posting?.title || d.role_title_en || '',
          department: d.application.job_posting?.requisition?.department || d.department || '',
          employment_type: d.application.job_posting?.requisition?.employment_type || '',
          documents: d.application.documents || [],
          offer: d.application.offer,
        });
      }
    } catch {
      Swal.fire("Error", "Failed to load staff data", "error");
      navigate("/hr/staff");
    } finally { setLoading(false); }
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

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
      streamRef.current = stream;
      setShowCamera(true);
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); } }, 100);
    } catch { Swal.fire("Error", "Could not access camera.", "error"); }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current; const video = videoRef.current;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) { const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' }); set('profile_photo', file); setPhotoPreview(canvas.toDataURL('image/jpeg')); }
      stopCamera(); setShowPhotoModal(false);
    }, 'image/jpeg', 0.9);
  };

  const stopCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setShowCamera(false);
  };

  const handleApplicantSelect = (appId) => {
    set('application_id', appId);
    const applicant = hiredApplicants.find(a => String(a.id) === String(appId));
    if (applicant) {
      setSelectedApplicant(applicant);
      setForm(prev => ({
        ...prev,
        application_id: appId,
        department: applicant.department || prev.department,
        role_title_en: applicant.position || prev.role_title_en,
      }));
    } else { setSelectedApplicant(null); }
  };

  const canNext = () => {
    if (step === 1) return form.application_id || isEdit;
    if (step === 3) {
      if (!form.branch_id) return false;
      if (form.has_probation && !form.probation_end_date) return false;
    }
    return true;
  };

  const submit = async () => {
    if (step !== STEPS.length) return;
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        if (val !== null && val !== undefined && val !== "") {
          formData.append(key, typeof val === 'boolean' ? (val ? '1' : '0') : val);
        }
      });
      if (isEdit) { await post(`/hr/staff/update/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }); }
      else { await post("/hr/staff/store", formData, { headers: { 'Content-Type': 'multipart/form-data' } }); }
      Swal.fire({ icon: "success", title: isEdit ? "Staff Updated!" : "Staff Registered!", timer: 2000, showConfirmButton: false });
      navigate("/hr/staff");
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "Failed to save staff", "error");
    } finally { setSaving(false); }
  };

  if (loading) return (<div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>);

  const cur = STEPS[step - 1];

  // ── Applicant Info Card (visible on all steps when selected) ──────
  const ApplicantInfoCard = () => {
    if (!selectedApplicant) return null;
    const a = selectedApplicant;
    return (
      <div className="bg-white rounded-2xl border border-teal-200 shadow-sm mb-4 overflow-hidden">
        <div className="px-5 py-3 bg-teal-50 border-b border-teal-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden">
            {photoPreview ? (
              <img src={photoPreview} alt={a.full_name} className="w-full h-full object-cover" />
            ) : a.full_name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800 truncate">{a.full_name}</p>
            <p className="text-[11px] text-teal-600 truncate">{a.position || "—"} {a.department ? `· ${a.department}` : ""}</p>
          </div>
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase flex-shrink-0">Hired</span>
        </div>
        <div className="px-5 py-3 grid grid-cols-3 md:grid-cols-5 gap-3">
          {[
            { l: "Email", v: a.email },
            { l: "Phone", v: a.contact_number },
            { l: "DOB", v: a.date_of_birth?.split("T")[0] },
            { l: "Education", v: a.education_level },
            { l: "Contract", v: CONTRACT_LABELS[a.employment_type] || a.employment_type },
          ].map(f => (
            <div key={f.l} className="min-w-0">
              <p className="text-[9px] font-semibold text-gray-400 uppercase">{f.l}</p>
              <p className="text-[11px] font-medium text-gray-700 truncate">{f.v || "—"}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="bg-teal-600 px-5 py-4">
        <div className="max-w-full mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/hr/staff")} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">{isEdit ? "Edit Staff" : "Register New Staff"}</h1>
            <p className="text-xs text-teal-100 mt-0.5">Step {step} of {STEPS.length} — {cur.label}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-full mx-auto px-4 py-3 flex items-center gap-1 overflow-x-auto">
          {STEPS.map((s, i) => {
            const done = step > s.num; const active = step === s.num;
            return (
              <div key={s.num} className="flex items-center gap-1 flex-shrink-0">
                <button type="button" onClick={() => done && setStep(s.num)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${active ? "bg-teal-600 text-white shadow-sm" : done ? "bg-teal-50 text-teal-700 cursor-pointer" : "bg-gray-100 text-gray-400 cursor-default"}`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${active ? "bg-white/25 text-white" : done ? "bg-teal-600 text-white" : "bg-gray-300 text-white"}`}>
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
        <div className="max-w-full mx-auto px-4 py-6 space-y-4">

          {/* Applicant card visible on all steps (after selection) */}
          {step > 1 && <ApplicantInfoCard />}

          {/* ── Step 1: Select Applicant ──────────────────────────────── */}
          {step === 1 && (
            <StepCard step={cur}>
              <div>
                <Label required>Full Name (English)</Label>
                <SearchSelect
                  options={hiredApplicants.map(a => ({ value: a.id, label: a.full_name }))}
                  value={form.application_id}
                  onChange={handleApplicantSelect}
                  placeholder="Search hired applicant by name..."
                />
                <p className="text-[10px] text-gray-400 mt-1.5">Only applicants with "Hired" status are shown</p>
              </div>

              {selectedApplicant && (
                <div className="mt-4 p-5 bg-teal-50 rounded-xl border border-teal-200 space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-teal-200">
                    <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                      {selectedApplicant.full_name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{selectedApplicant.full_name}</p>
                      <p className="text-xs text-teal-600">{selectedApplicant.position || "—"} {selectedApplicant.department ? `· ${selectedApplicant.department}` : ""}</p>
                    </div>
                    <span className="ml-auto px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase">Hired</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: "Email", value: selectedApplicant.email },
                      { label: "Phone", value: selectedApplicant.contact_number },
                      { label: "Date of Birth", value: selectedApplicant.date_of_birth?.split("T")[0] },
                      { label: "Education", value: selectedApplicant.education_level },
                      { label: "Field of Study", value: selectedApplicant.field_of_study },
                      { label: "Institution", value: selectedApplicant.institution_name },
                      { label: "Experience", value: selectedApplicant.total_experience_years ? `${selectedApplicant.total_experience_years} years` : null },
                      { label: "Contract Type", value: CONTRACT_LABELS[selectedApplicant.employment_type] || selectedApplicant.employment_type },
                      { label: "Address", value: selectedApplicant.current_address },
                    ].map(f => (
                      <div key={f.label} className="bg-white rounded-lg p-2.5 border border-teal-100">
                        <p className="text-[9px] font-semibold text-teal-500 uppercase tracking-wider">{f.label}</p>
                        <p className="text-xs font-medium text-gray-800 mt-0.5 truncate">{f.value || "—"}</p>
                      </div>
                    ))}
                  </div>

                  {selectedApplicant.documents?.length > 0 && (
                    <div className="pt-3 border-t border-teal-200">
                      <p className="text-[10px] font-semibold text-teal-600 uppercase tracking-wider mb-2">Documents</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedApplicant.documents.map((doc, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-teal-200 rounded-lg text-[11px] font-medium text-teal-700">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            {DOCUMENT_TYPES[doc.document_type] || doc.document_type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedApplicant.offer && (
                    <div className="pt-3 border-t border-teal-200">
                      <p className="text-[10px] font-semibold text-teal-600 uppercase tracking-wider mb-2">Offer</p>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { l: "Salary", v: `${selectedApplicant.offer.salary_currency || "AFN"} ${Number(selectedApplicant.offer.salary_amount || 0).toLocaleString()}` },
                          { l: "Start Date", v: selectedApplicant.offer.start_date?.split("T")[0] },
                          { l: "Status", v: selectedApplicant.offer.status },
                        ].map(f => (
                          <div key={f.l} className="bg-white rounded-lg p-2.5 border border-teal-100">
                            <p className="text-[9px] font-semibold text-teal-500 uppercase">{f.l}</p>
                            <p className="text-xs font-bold text-gray-800 capitalize">{f.v || "—"}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </StepCard>
          )}

          {/* ── Step 2: Staff Details ─────────────────────────────────── */}
          {step === 2 && (
            <StepCard step={cur}>
              {/* Photo */}
              <div className="flex items-center gap-5 pb-5 border-b border-gray-100">
                <button type="button" onClick={() => setShowPhotoModal(true)} className="flex-shrink-0 group">
                  <div className="w-20 h-20 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 group-hover:border-teal-400 flex items-center justify-center overflow-hidden transition-colors relative cursor-pointer">
                    {photoPreview ? (
                      <><img src={photoPreview} alt="Preview" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div></>
                    ) : (
                      <div className="flex flex-col items-center gap-1"><svg className="w-7 h-7 text-gray-300 group-hover:text-teal-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg><span className="text-[8px] font-semibold text-gray-400 group-hover:text-teal-500 uppercase">Add Photo</span></div>
                    )}
                  </div>
                </button>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-700">{photoPreview ? "Photo added" : "Profile Photo"}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Click to upload or capture</p>
                </div>
              </div>
              <input ref={fileInputRef} type="file" name="profile_photo" accept="image/*" onChange={(e) => { handleFileChange(e); setShowPhotoModal(false); }} className="hidden" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Father's Name</Label>
                  <input type="text" name="father_name" value={form.father_name} onChange={handle} className={inp} placeholder="Enter father's name" />
                </div>
                <div>
                  <Label>Blood Type</Label>
                  <SearchSelect options={BLOOD_TYPES} value={form.blood_type} onChange={v => set('blood_type', v)} placeholder="Select blood type..." />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <p className="text-[11px] font-semibold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                  Emergency Contact
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Contact Name</Label><input type="text" name="emergency_contact_name" value={form.emergency_contact_name} onChange={handle} className={inp} placeholder="Contact person name" /></div>
                  <div><Label>Contact Phone</Label><input type="tel" name="emergency_contact_phone" value={form.emergency_contact_phone} onChange={handle} className={inp} placeholder="07X XXX XXXX" /></div>
                </div>
              </div>
            </StepCard>
          )}

          {/* ── Step 3: Employment ─────────────────────────────────────── */}
          {step === 3 && (
            <StepCard step={cur}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label required>Branch</Label>
                  <SearchSelect
                    options={branches.map(b => ({ value: b.id, label: b.name }))}
                    value={form.branch_id}
                    onChange={v => set('branch_id', v)}
                    placeholder="Select branch..."
                  />
                </div>
                <div>
                  <Label>Department</Label>
                  <input type="text" value={form.department || "—"} readOnly className={`${inp} bg-gray-50 text-gray-500 cursor-not-allowed`} />
                </div>
                <div>
                  <Label>Position Title</Label>
                  <input type="text" value={form.role_title_en || "—"} readOnly className={`${inp} bg-gray-50 text-gray-500 cursor-not-allowed`} />
                </div>
                <div>
                  <Label>Contract Type</Label>
                  <input type="text" value={CONTRACT_LABELS[selectedApplicant?.employment_type] || "—"} readOnly className={`${inp} bg-gray-50 text-gray-500 cursor-not-allowed`} />
                </div>
              </div>

              {/* Probation */}
              <div className="pt-4 border-t border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`relative w-10 h-5 rounded-full transition-colors ${form.has_probation ? 'bg-teal-600' : 'bg-gray-300'}`}
                    onClick={() => {
                      const newVal = !form.has_probation;
                      set('has_probation', newVal);
                      if (newVal) {
                        const startDate = selectedApplicant?.offer?.start_date?.split("T")[0];
                        const base = startDate ? new Date(startDate) : new Date();
                        base.setMonth(base.getMonth() + 1);
                        set('probation_end_date', base.toISOString().split("T")[0]);
                      } else { set('probation_end_date', ''); }
                    }}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.has_probation ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-teal-600 transition-colors">Has Probation Period</span>
                </label>

                {form.has_probation && (
                  <div className="mt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Start Date (from offer)</Label>
                        <input type="text" value={selectedApplicant?.offer?.start_date?.split("T")[0] || new Date().toISOString().split("T")[0]} readOnly className={`${inp} bg-gray-50 text-gray-500 cursor-not-allowed`} />
                      </div>
                      <div>
                        <Label required>Probation End Date</Label>
                        <input type="date" name="probation_end_date" value={form.probation_end_date} onChange={handle} className={inp} />
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">Default: 1 month from start date. You can adjust.</p>
                  </div>
                )}
              </div>
            </StepCard>
          )}

          {/* ── Step 4: Review & Confirm ───────────────────────────────── */}
          {step === 4 && (
            <StepCard step={cur}>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5">
                <p className="text-xs font-bold text-gray-700 mb-3">Registration Summary</p>
                {[
                  { label: "Applicant", value: selectedApplicant?.full_name },
                  { label: "Email", value: selectedApplicant?.email },
                  { label: "Phone", value: selectedApplicant?.contact_number },
                  { label: "Position", value: form.role_title_en },
                  { label: "Department", value: form.department },
                  { label: "Branch", value: branches.find(b => String(b.id) === String(form.branch_id))?.name },
                  { label: "Contract Type", value: CONTRACT_LABELS[selectedApplicant?.employment_type] || selectedApplicant?.employment_type },
                  { label: "Father's Name", value: form.father_name },
                  { label: "Blood Type", value: form.blood_type },
                  { label: "Emergency Contact", value: form.emergency_contact_name ? `${form.emergency_contact_name} (${form.emergency_contact_phone})` : null },
                  { label: "Probation", value: form.has_probation ? `Yes — until ${form.probation_end_date}` : "No" },
                  { label: "Photo", value: photoPreview ? "Uploaded" : "None" },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                    <span className="text-xs text-gray-500">{r.label}</span>
                    <span className="text-xs font-semibold text-gray-800 capitalize">{r.value || "—"}</span>
                  </div>
                ))}
              </div>
            </StepCard>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => step > 1 ? setStep(s => s - 1) : navigate("/hr/staff")}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              {step === 1 ? "Cancel" : "Back"}
            </button>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {STEPS.map(s => (<div key={s.num} className={`h-1.5 rounded-full transition-all ${s.num === step ? "w-6 bg-teal-600" : s.num < step ? "w-3 bg-teal-300" : "w-3 bg-gray-200"}`} />))}
              </div>
              {step < STEPS.length ? (
                <button type="button" disabled={!canNext()} onClick={() => setStep(s => s + 1)}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  Next <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
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

      {/* ── Photo Modal ────────────────────────────────────────────── */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { if (!showCamera) setShowPhotoModal(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-800">{showCamera ? "Capture Photo" : "Profile Photo"}</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">{showCamera ? "Position yourself and capture" : "Choose how to add your photo"}</p>
              </div>
              <button type="button" onClick={() => { stopCamera(); setShowPhotoModal(false); }} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5">
              {showCamera ? (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]"><video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" /><canvas ref={canvasRef} className="hidden" /></div>
                  <div className="flex gap-2">
                    <button type="button" onClick={capturePhoto} className="flex-1 flex items-center justify-center gap-2 py-3 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth={2} /><circle cx="12" cy="12" r="4" fill="currentColor" /></svg> Capture
                    </button>
                    <button type="button" onClick={stopCamera} className="py-3 px-5 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-all">Back</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {photoPreview && (
                    <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-xl border border-teal-200">
                      <img src={photoPreview} alt="Current" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-gray-800">Current photo</p><p className="text-[10px] text-teal-600">Click below to change</p></div>
                    </div>
                  )}
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-teal-400 hover:bg-teal-50/50 transition-all group text-left">
                    <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-200 transition-colors"><svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>
                    <div><p className="text-sm font-semibold text-gray-800">Upload from Files</p><p className="text-[11px] text-gray-400 mt-0.5">JPG, PNG — Max 2MB</p></div>
                    <svg className="w-4 h-4 text-gray-300 ml-auto group-hover:text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                  <button type="button" onClick={startCamera} className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-cyan-400 hover:bg-cyan-50/50 transition-all group text-left">
                    <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center flex-shrink-0 group-hover:bg-cyan-200 transition-colors"><svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>
                    <div><p className="text-sm font-semibold text-gray-800">Take with Camera</p><p className="text-[11px] text-gray-400 mt-0.5">Use your device camera</p></div>
                    <svg className="w-4 h-4 text-gray-300 ml-auto group-hover:text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                  {photoPreview && (
                    <button type="button" onClick={() => { set('profile_photo', null); setPhotoPreview(null); setShowPhotoModal(false); }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Remove Photo
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
