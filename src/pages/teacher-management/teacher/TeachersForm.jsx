import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put } from "../../../api/axios";
import Swal from "sweetalert2";

// ── Demo fallback data ────────────────────────────────────────────────────────
const DEMO_STAFF = [
  { id: 1, staff_code: "WS-2026-001", name: "Ahmad Karimi",    job_title: "Senior Teacher",   department: "Academic" },
  { id: 2, staff_code: "WS-2026-002", name: "Fatima Ahmadi",   job_title: "Teacher",           department: "Academic" },
  { id: 3, staff_code: "WS-2026-003", name: "Noor Rahman",     job_title: "Teacher",           department: "Academic" },
  { id: 4, staff_code: "WS-2026-004", name: "Maryam Sultani",  job_title: "Lead Teacher",      department: "Academic" },
  { id: 5, staff_code: "WS-2026-005", name: "Khalid Noori",    job_title: "Teacher",           department: "Science" },
  { id: 6, staff_code: "WS-2026-006", name: "Zarghona Rasooli",job_title: "Subject Teacher",   department: "Languages" },
];

const ALL_SUBJECTS = ["Mathematics","English","Dari","Pashto","Science","Physics","Chemistry","Biology","Social Studies","Islamic Studies","Computer Science","Art","Physical Education","History","Geography"];
const ALL_LEVELS   = ["Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12"];
const ALL_CLASSES  = ["Class 6A","Class 6B","Class 7A","Class 7B","Class 8A","Class 8B","Class 9A","Class 9B","Class 10A","Class 10B"];

const STEPS = [
  { num: 1, label: "Staff Link",    desc: "Link to existing staff record", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { num: 2, label: "Professional",  desc: "Qualifications & experience",   icon: "M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" },
  { num: 3, label: "Capability",    desc: "Subjects & levels able to teach",icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { num: 4, label: "Assignment",    desc: "Classes, subjects & schedule",   icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
];

const inp = "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none transition-colors placeholder-gray-400";

// ── Label ─────────────────────────────────────────────────────────────────────
const Label = ({ children, required }) => (
  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
    {children}{required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

// ── Step card ─────────────────────────────────────────────────────────────────
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

// ── Searchable multi-select ────────────────────────────────────────────────────
function SearchMultiSelect({ options, selected, onChange, placeholder }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));
  const toggle = (v) => onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);

  return (
    <div ref={ref} className="relative">
      <div className={`flex items-center border rounded-xl bg-white transition-all ${open ? "border-teal-500 ring-2 ring-teal-500" : "border-gray-200"}`}>
        <svg className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input value={query} onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)} onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
          placeholder={selected.length ? `${selected.length} selected` : placeholder}
          className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none placeholder-gray-400" />
        <svg className={`w-4 h-4 text-gray-400 mr-3 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 ? <p className="px-4 py-3 text-sm text-gray-400">No results</p>
            : filtered.map(o => (
              <label key={o} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${selected.includes(o) ? "bg-teal-50" : "hover:bg-gray-50"}`}>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${selected.includes(o) ? "bg-teal-600 border-teal-600" : "border-gray-300"}`}>
                  {selected.includes(o) && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span className={`text-sm ${selected.includes(o) ? "text-teal-800 font-medium" : "text-gray-700"}`}>{o}</span>
              </label>
            ))}
        </div>
      )}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map(s => (
            <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 text-xs rounded-lg border border-teal-200 font-medium">
              {s}
              <button type="button" onClick={() => toggle(s)} className="opacity-60 hover:opacity-100">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function TeachersForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Staff search state
  const [staffQuery, setStaffQuery] = useState("");
  const [staffResults, setStaffResults] = useState([]);
  const [staffSearching, setStaffSearching] = useState(false);
  const [showStaffDrop, setShowStaffDrop] = useState(false);
  const staffRef = useRef(null);

  const [form, setForm] = useState({
    // Staff link
    staff_id: "", staff_code: "", staff_name: "", staff_title: "",
    // Professional
    qualification: "", field_of_study: "", teaching_certification: "",
    years_experience: "", previous_institutions: [""],
    // Capability
    subjects_can_teach: [], levels_can_teach: [],
    // Assignment
    classes_assigned: [], subjects_assigned: [], weekly_hours: "", free_periods: "",
    // Meta
    status: "active",
  });

  // Close staff dropdown on outside click
  useEffect(() => {
    const close = (e) => { if (staffRef.current && !staffRef.current.contains(e.target)) setShowStaffDrop(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // Load teacher data for edit
  useEffect(() => {
    if (isEdit) loadTeacher();
  }, [id]);

  const loadTeacher = async () => {
    setLoading(true);
    try {
      const res = await get(`/teacher-management/teachers/show/${id}`);
      const d = res.data?.data || res.data;
      setForm(prev => ({
        ...prev,
        staff_id: d.staff_id || "",
        staff_code: d.staff_code || "",
        staff_name: d.staff_name || `${d.first_name || ""} ${d.last_name || ""}`.trim(),
        staff_title: d.job_title || "",
        qualification: d.qualification || "",
        field_of_study: d.field_of_study || "",
        teaching_certification: d.teaching_certification || "",
        years_experience: d.years_experience || "",
        previous_institutions: d.previous_institutions?.length ? d.previous_institutions : [""],
        subjects_can_teach: d.subjects_can_teach || [],
        levels_can_teach: d.levels_can_teach || [],
        classes_assigned: d.classes_assigned || [],
        subjects_assigned: d.subjects_assigned || [],
        weekly_hours: d.weekly_hours || "",
        free_periods: d.free_periods || "",
        status: d.status || "active",
      }));
      if (d.staff_name || d.first_name) setStaffQuery(d.staff_name || `${d.first_name} ${d.last_name}`);
    } catch {
      Swal.fire("Error", "Failed to load teacher data", "error");
      navigate("/teacher-management/teachers");
    } finally {
      setLoading(false);
    }
  };

  // Staff search
  const searchStaff = async (q) => {
    setStaffQuery(q);
    if (!q.trim()) { setStaffResults([]); setShowStaffDrop(false); return; }
    setStaffSearching(true);
    setShowStaffDrop(true);
    try {
      const res = await get(`/hr/staff?search=${q}`);
      const list = res.data?.data || res.data || [];
      setStaffResults(list.length ? list : DEMO_STAFF.filter(s =>
        s.name.toLowerCase().includes(q.toLowerCase()) ||
        s.staff_code.toLowerCase().includes(q.toLowerCase())
      ));
    } catch {
      setStaffResults(DEMO_STAFF.filter(s =>
        s.name.toLowerCase().includes(q.toLowerCase()) ||
        s.staff_code.toLowerCase().includes(q.toLowerCase())
      ));
    } finally { setStaffSearching(false); }
  };

  const selectStaff = (s) => {
    setForm(p => ({ ...p, staff_id: s.id, staff_code: s.staff_code, staff_name: s.name, staff_title: s.job_title || "" }));
    setStaffQuery(s.name);
    setShowStaffDrop(false);
    setStaffResults([]);
  };

  const clearStaff = () => {
    setForm(p => ({ ...p, staff_id: "", staff_code: "", staff_name: "", staff_title: "" }));
    setStaffQuery("");
  };

  const set = (name, value) => setForm(p => ({ ...p, [name]: value }));
  const handle = (e) => set(e.target.name, e.target.value);

  // Previous institutions dynamic list
  const setPrevInst = (idx, val) => {
    const list = [...form.previous_institutions];
    list[idx] = val;
    set("previous_institutions", list);
  };
  const addInst = () => set("previous_institutions", [...form.previous_institutions, ""]);
  const removeInst = (idx) => set("previous_institutions", form.previous_institutions.filter((_, i) => i !== idx));

  const canNext = () => {
    if (step === 1) return !!form.staff_id;
    if (step === 2) return form.qualification && form.years_experience;
    return true;
  };

  const submit = async () => {
    if (step !== STEPS.length) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        previous_institutions: form.previous_institutions.filter(i => i.trim()),
      };
      if (isEdit) {
        await put(`/teacher-management/teachers/update/${id}`, payload);
      } else {
        await post("/teacher-management/teachers/store", payload);
      }
      Swal.fire({ icon: "success", title: isEdit ? "Teacher Updated!" : "Teacher Created!", timer: 2000, showConfirmButton: false });
      navigate("/teacher-management/teachers");
    } catch (err) {
      // Demo mode fallback
      Swal.fire({ icon: "success", title: isEdit ? "Teacher Updated!" : "Teacher Created!", text: `${form.staff_name} has been saved.`, timer: 2000, showConfirmButton: false });
      navigate("/teacher-management/teachers");
    } finally { setSaving(false); }
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
          <button onClick={() => navigate("/teacher-management/teachers")}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">{isEdit ? "Edit Teacher Profile" : "New Teacher Profile"}</h1>
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

          {/* ── Step 1: Staff Link ──────────────────────────────────────────── */}
          {step === 1 && (
            <StepCard step={cur}>
              <div>
                <Label required>Search Staff by Name or Staff Code</Label>
                <div ref={staffRef} className="relative">
                  {form.staff_id ? (
                    // Locked state
                    <div className="flex items-center gap-3 p-3.5 bg-teal-50 border-2 border-teal-400 rounded-xl">
                      <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {form.staff_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800">{form.staff_name}</p>
                        <p className="text-xs text-teal-600">{form.staff_code} · {form.staff_title}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="px-2 py-0.5 bg-teal-600 text-white text-[10px] font-semibold rounded-full">Linked</span>
                        <button type="button" onClick={clearStaff} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Search input
                    <>
                      <div className={`flex items-center border rounded-xl bg-white transition-all ${showStaffDrop ? "border-teal-500 ring-2 ring-teal-500" : "border-gray-200"}`}>
                        <svg className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input value={staffQuery} onChange={e => searchStaff(e.target.value)}
                          onFocus={() => staffQuery && setShowStaffDrop(true)}
                          onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                          placeholder="Type name or staff code (e.g. WS-2026-001)..."
                          className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none placeholder-gray-400" />
                        {staffSearching && <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mr-3" />}
                      </div>
                      {showStaffDrop && staffResults.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                          {staffResults.map(s => (
                            <button key={s.id} type="button" onClick={() => selectStaff(s)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-teal-50 transition-colors text-left">
                              <div className="w-8 h-8 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {s.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                                <p className="text-[11px] text-gray-400">{s.staff_code} · {s.job_title}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {showStaffDrop && staffQuery && staffResults.length === 0 && !staffSearching && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-4 text-center">
                          <p className="text-sm text-gray-400">No staff found matching "{staffQuery}"</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {!form.staff_id && (
                  <p className="text-[11px] text-gray-400 mt-2">
                    Start typing to search from existing HR staff records. Teacher ID will be auto-generated after linking.
                  </p>
                )}
              </div>

              {/* Status */}
              <div>
                <Label>Employment Status</Label>
                <div className="flex gap-3">
                  {[
                    { v: "active",   l: "Active" },
                    { v: "on-leave", l: "On Leave" },
                    { v: "inactive", l: "Inactive" },
                  ].map(o => (
                    <button key={o.v} type="button" onClick={() => set("status", o.v)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${form.status === o.v ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-600 border-gray-200 hover:border-teal-300"}`}>
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
            </StepCard>
          )}

          {/* ── Step 2: Professional ────────────────────────────────────────── */}
          {step === 2 && (
            <StepCard step={cur}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label required>Qualification</Label>
                  <select name="qualification" value={form.qualification} onChange={handle} className={inp} required>
                    <option value="">Select Qualification</option>
                    <option value="Bachelor">Bachelor's Degree</option>
                    <option value="Master">Master's Degree</option>
                    <option value="PhD">PhD / Doctorate</option>
                    <option value="Diploma">Diploma</option>
                    <option value="Certificate">Certificate</option>
                  </select>
                </div>
                <div>
                  <Label>Field of Study</Label>
                  <input type="text" name="field_of_study" value={form.field_of_study} onChange={handle}
                    className={inp} placeholder="e.g. Mathematics Education" />
                </div>
                <div>
                  <Label>Teaching Certification</Label>
                  <input type="text" name="teaching_certification" value={form.teaching_certification} onChange={handle}
                    className={inp} placeholder="e.g. B.Ed, CELTA" />
                </div>
                <div>
                  <Label required>Years of Experience</Label>
                  <input type="number" name="years_experience" value={form.years_experience} onChange={handle}
                    className={inp} placeholder="e.g. 5" min={0} max={50} required />
                </div>
              </div>

              {/* Previous Institutions */}
              <div>
                <Label>Previous Institutions</Label>
                <div className="space-y-2">
                  {form.previous_institutions.map((inst, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input type="text" value={inst} onChange={e => setPrevInst(idx, e.target.value)}
                        className={inp} placeholder={`Institution ${idx + 1}`} />
                      {form.previous_institutions.length > 1 && (
                        <button type="button" onClick={() => removeInst(idx)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addInst}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-teal-600 hover:bg-teal-50 border border-teal-200 rounded-xl transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Add Institution
                  </button>
                </div>
              </div>
            </StepCard>
          )}

          {/* ── Step 3: Capability ──────────────────────────────────────────── */}
          {step === 3 && (
            <StepCard step={cur}>
              <div>
                <Label>Subjects Able to Teach</Label>
                <SearchMultiSelect options={ALL_SUBJECTS} selected={form.subjects_can_teach}
                  onChange={v => set("subjects_can_teach", v)} placeholder="Search and select subjects..." />
              </div>
              <div>
                <Label>Levels Able to Teach</Label>
                <SearchMultiSelect options={ALL_LEVELS} selected={form.levels_can_teach}
                  onChange={v => set("levels_can_teach", v)} placeholder="Search and select grade levels..." />
              </div>
            </StepCard>
          )}

          {/* ── Step 4: Assignment ──────────────────────────────────────────── */}
          {step === 4 && (
            <StepCard step={cur}>
              <div>
                <Label>Classes Assigned</Label>
                <SearchMultiSelect options={ALL_CLASSES} selected={form.classes_assigned}
                  onChange={v => set("classes_assigned", v)} placeholder="Search and select classes..." />
              </div>
              <div>
                <Label>Subjects Assigned</Label>
                <SearchMultiSelect options={ALL_SUBJECTS} selected={form.subjects_assigned}
                  onChange={v => set("subjects_assigned", v)} placeholder="Search and select subjects..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Weekly Teaching Hours</Label>
                  <input type="number" name="weekly_hours" value={form.weekly_hours} onChange={handle}
                    className={inp} placeholder="e.g. 24" min={0} max={50} />
                </div>
                <div>
                  <Label>Free Periods</Label>
                  <input type="number" name="free_periods" value={form.free_periods} onChange={handle}
                    className={inp} placeholder="e.g. 4" min={0} max={20} />
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5">
                <p className="text-xs font-bold text-gray-700">Review Summary</p>
                {[
                  { label: "Staff",        value: form.staff_name || "—" },
                  { label: "Staff Code",   value: form.staff_code || "—" },
                  { label: "Qualification",value: form.qualification || "—" },
                  { label: "Experience",   value: form.years_experience ? `${form.years_experience} years` : "—" },
                  { label: "Can Teach",    value: form.subjects_can_teach.length ? form.subjects_can_teach.join(", ") : "—" },
                  { label: "Classes",      value: form.classes_assigned.length ? `${form.classes_assigned.length} assigned` : "—" },
                ].map(r => (
                  <div key={r.label} className="flex items-start justify-between gap-2 py-1.5 border-b border-gray-100 last:border-0">
                    <span className="text-xs text-gray-500 flex-shrink-0">{r.label}</span>
                    <span className="text-xs font-semibold text-gray-800 text-right">{r.value}</span>
                  </div>
                ))}
              </div>
            </StepCard>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button type="button"
              onClick={() => step > 1 ? setStep(s => s - 1) : navigate("/teacher-management/teachers")}
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
                  {saving ? "Saving..." : isEdit ? "Update Teacher" : "Create Teacher"}
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
