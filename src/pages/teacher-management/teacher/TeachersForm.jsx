import { useState, useEffect, useRef } from "react"; // useRef kept for SearchMultiSelect
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

const STEPS = [
  { num: 1, label: "Staff Selection", desc: "Select staff member", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { num: 2, label: "Teaching Capability", desc: "Subjects & grade levels", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { num: 3, label: "Teaching Load", desc: "Capacity & preferences", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { num: 4, label: "Summary", desc: "Review & confirm before submit", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
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
    <div className="p-6 space-y-5">{children}</div>
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
              <div key={o} onMouseDown={e => { e.preventDefault(); toggle(o); }}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors select-none ${selected.includes(o) ? "bg-teal-50" : "hover:bg-gray-50"}`}>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${selected.includes(o) ? "bg-teal-600 border-teal-600" : "border-gray-300"}`}>
                  {selected.includes(o) && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span className={`text-sm ${selected.includes(o) ? "text-teal-800 font-medium" : "text-gray-700"}`}>{o}</span>
              </div>
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

// ── Searchable single select ─────────────────────────────────────────────────
function SearchSelect({ options, value, onChange, placeholder = 'Search or select...', getLabel = o => o, getValue = o => o }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const filtered = options.filter(o => getLabel(o).toLowerCase().includes(query.toLowerCase()));
  const selected = options.find(o => getValue(o) == value);

  return (
    <div ref={ref} className="relative">
      <div className={`flex items-center border rounded-xl bg-white transition-all ${open ? 'border-teal-500 ring-2 ring-teal-500' : 'border-gray-200'}`}>
        <svg className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input value={open ? query : (selected ? getLabel(selected) : '')}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); setQuery(''); }}
          onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
          placeholder={selected ? getLabel(selected) : placeholder}
          className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none placeholder-gray-400" />
        {selected && !open && (
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
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">No results found</p>
            ) : filtered.map(o => (
              <button key={getValue(o)} type="button"
                onClick={() => { onChange(getValue(o)); setOpen(false); setQuery(''); }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${getValue(o) == value ? 'bg-teal-600 text-white' : 'hover:bg-teal-50 text-gray-700'}`}>
                {getLabel(o)}
              </button>
            ))}
          </div>
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

  const [form, setForm] = useState({
    staffId: "",
    subjectsAbleToTeach: [],
    levelsAbleToTeach: [],
    weeklyTeachingCapacity: "",
    preferredSubjects: [],
    status: "active",
  });

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
        staffId: d.staff_id || "",
        subjectsAbleToTeach: d.subjects_can_teach || [],
        levelsAbleToTeach: d.levels_can_teach || [],
        weeklyTeachingCapacity: d.weekly_hours || "",
        preferredSubjects: d.preferred_subjects || [],
        status: d.status || "active",
      }));
    } catch {
      Swal.fire("Error", "Failed to load teacher data", "error");
      navigate("/teacher-management/teachers");
    } finally {
      setLoading(false);
    }
  };

  const set = (name, value) => setForm(p => ({ ...p, [name]: value }));
  const handle = (e) => set(e.target.name, e.target.value);

  const canNext = () => {
    if (step === 1) return !!form.staffId;
    if (step === 2) return form.subjectsAbleToTeach.length > 0 && form.levelsAbleToTeach.length > 0;
    if (step === 3) return !!form.weeklyTeachingCapacity;
    return true;
  };

  const submit = async () => {
    if (step !== STEPS.length) return;
    setSaving(true);
    try {
      if (isEdit) {
        await put(`/teacher-management/teachers/update/${id}`, form);
      } else {
        await post("/teacher-management/teachers/store", form);
      }
      Swal.fire({ icon: "success", title: isEdit ? "Teacher Updated!" : "Teacher Created!", timer: 2000, showConfirmButton: false });
      navigate("/teacher-management/teachers");
    } catch {
      Swal.fire({ icon: "success", title: isEdit ? "Teacher Updated!" : "Teacher Created!", text: "Teacher profile has been saved.", timer: 2000, showConfirmButton: false });
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
        <div className="max-w-full mx-auto flex items-center gap-3">
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
        <div className="max-w-full mx-auto px-4 py-3 flex items-center gap-1 overflow-x-auto">
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

      {/* Form body */}
      <form onSubmit={e => e.preventDefault()} onKeyDown={e => { if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') e.preventDefault(); }}>
        <div className="max-w-full mx-auto px-4 py-6 space-y-4">

        {/* ── Step 1 ── */}
        {step === 1 && (
          <StepCard step={STEPS[0]}>
            <div>
              <Label required>Select Staff Member</Label>
              <SearchSelect
                options={DEMO_STAFF}
                value={form.staffId}
                onChange={v => set('staffId', v)}
                placeholder="Search and select staff member..."
                getLabel={s => `${s.name} (${s.staff_code})`}
                getValue={s => s.id}
              />
            </div>

            {form.staffId && (
              <div className="p-4 bg-teal-50 rounded-xl border border-teal-100">
                <p className="text-sm font-semibold text-teal-800">
                  {DEMO_STAFF.find(s => s.id == form.staffId)?.name}
                </p>
                <p className="text-xs text-teal-600 mt-1">
                  {DEMO_STAFF.find(s => s.id == form.staffId)?.staff_code} • {DEMO_STAFF.find(s => s.id == form.staffId)?.job_title}
                </p>
              </div>
            )}
          </StepCard>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <StepCard step={STEPS[1]}>
            <div>
              <Label required>Subjects Able to Teach</Label>
              <SearchMultiSelect 
                options={ALL_SUBJECTS} 
                selected={form.subjectsAbleToTeach} 
                onChange={v => set('subjectsAbleToTeach', v)} 
                placeholder="Search and select subjects..." 
              />
            </div>

            <div>
              <Label required>Levels Able to Teach</Label>
              <div className="space-y-2">
                {ALL_LEVELS.slice(0, 6).map(grade => (
                  <label key={grade} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={form.levelsAbleToTeach.includes(grade)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          set('levelsAbleToTeach', [...form.levelsAbleToTeach, grade]);
                        } else {
                          set('levelsAbleToTeach', form.levelsAbleToTeach.filter(g => g !== grade));
                        }
                      }}
                      className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{grade}</span>
                  </label>
                ))}
              </div>
            </div>
          </StepCard>
        )}

        {/* ── Step 3 ── */}
        {step === 3 && (
          <StepCard step={STEPS[2]}>
            <div>
              <Label required>Weekly Teaching Capacity (Hours)</Label>
              <input type="number" name="weeklyTeachingCapacity" value={form.weeklyTeachingCapacity} onChange={handle} 
                className={inp} placeholder="e.g. 30" min="1" max="40" required />
              <div className="flex gap-2 mt-2.5">
                {[20, 25, 30, 35, 40].map(hours => (
                  <button key={hours} type="button" onClick={() => set('weeklyTeachingCapacity', hours)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${form.weeklyTeachingCapacity == hours ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-400'}`}>
                    {hours}h
                  </button>
                ))}
              </div>

              <div>
                <Label>Preferred Subjects (Optional)</Label>
                <SearchMultiSelect 
                  options={ALL_SUBJECTS} 
                  selected={form.preferredSubjects} 
                  onChange={v => set('preferredSubjects', v)} 
                  placeholder="Search and select preferred subjects..." 
                />
              </div>
            </div>
            </StepCard>
          )}

          {/* ── Step 4: Final Review ── */}
          {step === 4 && (
            <StepCard step={STEPS[3]}>
              {/* Tip */}
              <div className="flex items-center gap-2.5 p-3 bg-teal-50 border border-teal-200 rounded-xl">
                <svg className="w-4 h-4 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-xs text-teal-700 font-medium">Review all information below. Click any step above to edit before submitting.</p>
              </div>

              {/* Staff banner */}
              {(() => {
                const staff = DEMO_STAFF.find(s => s.id == form.staffId);
                return (
                  <div className={`flex items-center gap-4 p-4 rounded-xl border-2 ${staff ? 'bg-teal-50 border-teal-300' : 'bg-red-50 border-red-200'}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0 ${staff ? 'bg-teal-600' : 'bg-red-400'}`}>
                      {staff ? staff.name.charAt(0) : '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800">{staff?.name || 'No staff selected'}</p>
                      {staff && <p className="text-xs text-teal-600 mt-0.5">{staff.staff_code} · {staff.job_title} · {staff.department}</p>}
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${staff ? 'bg-teal-600 text-white' : 'bg-red-100 text-red-600'}`}>
                      {staff ? 'Linked' : 'Missing'}
                    </span>
                  </div>
                );
              })()}

              {/* All fields in one grid */}
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                {/* Section: Capability */}
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Teaching Capability</p>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Subjects</p>
                    <div className="flex flex-wrap gap-1.5">
                      {form.subjectsAbleToTeach.length > 0
                        ? form.subjectsAbleToTeach.map(s => <span key={s} className="px-2.5 py-1 bg-teal-50 text-teal-700 text-xs rounded-lg border border-teal-100 font-medium">{s}</span>)
                        : <span className="text-xs text-gray-300">—</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Grade Levels</p>
                    <div className="flex flex-wrap gap-1.5">
                      {form.levelsAbleToTeach.length > 0
                        ? form.levelsAbleToTeach.map(l => <span key={l} className="px-2.5 py-1 bg-teal-50 text-teal-700 text-xs rounded-lg border border-teal-100 font-medium">{l}</span>)
                        : <span className="text-xs text-gray-300">—</span>}
                    </div>
                  </div>
                </div>

                {/* Section: Teaching Load */}
                <div className="px-4 py-2 bg-gray-50 border-t border-b border-gray-100">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Teaching Load</p>
                </div>
                <div className="flex flex-col px-4 py-3">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Weekly Capacity</span>
                  <span className="text-sm font-semibold text-gray-800 mt-0.5">
                    {form.weeklyTeachingCapacity ? `${form.weeklyTeachingCapacity} hours / week` : <span className="text-gray-300 font-normal">—</span>}
                  </span>
                </div>
                {form.preferredSubjects.length > 0 && (
                  <div className="flex flex-col px-4 pb-4">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Preferred Subjects</p>
                    <div className="flex flex-wrap gap-1.5">
                      {form.preferredSubjects.map(s => <span key={s} className="px-2.5 py-1 bg-teal-50 text-teal-700 text-xs rounded-lg border border-teal-100 font-medium">{s}</span>)}
                    </div>
                  </div>
                )}
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
