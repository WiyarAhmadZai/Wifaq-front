import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';

const TEACHERS = [
  { id: 1, name: 'Ahmad Karimi' },
  { id: 2, name: 'Fatima Ahmadi' },
  { id: 3, name: 'Noor Rahman' },
  { id: 4, name: 'Maryam Sultani' },
  { id: 5, name: 'Khalid Noori' },
];
const SUBJECTS = ['Mathematics','English','Dari','Pashto','Science','Social Studies','Islamic Studies','Computer Science','Art','Physical Education'];
const ACADEMIC_YEARS = ['1402-1403','1403-1404','1404-1405','1405-1406'];
const GRADES = Array.from({ length: 12 }, (_, i) => `${i + 1}`);

const STEPS = [
  { num: 1, label: 'Basic Class Info', desc: 'Grade, section, name & year',    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { num: 2, label: 'Location',       desc: 'Room, building & floor',          icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' },
  { num: 3, label: 'Administration', desc: 'Supervisor & assistant',           icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { num: 4, label: 'Capacity',       desc: 'Max students per class',           icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
];

const inp = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white transition-colors placeholder-gray-400 outline-none';

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
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
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

// ── Searchable multi select ──────────────────────────────────────────────────
function SearchMultiSelect({ options, selected, onChange, placeholder = 'Search or select...' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));
  const toggle = (v) => onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);

  return (
    <div ref={ref} className="relative">
      <div className={`flex items-center border rounded-xl bg-white transition-all ${open ? 'border-teal-500 ring-2 ring-teal-500' : 'border-gray-200'}`}>
        <svg className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input value={query} onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)} onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
          placeholder={selected.length ? `${selected.length} selected` : placeholder}
          className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none placeholder-gray-400" />
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
              <button key={o} type="button" onClick={() => toggle(o)}
                className={`w-full text-left flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${selected.includes(o) ? 'bg-teal-50' : 'hover:bg-gray-50'}`}>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selected.includes(o) ? 'bg-teal-600 border-teal-600' : 'border-gray-300'}`}>
                  {selected.includes(o) && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span className={`text-sm ${selected.includes(o) ? 'text-teal-800 font-medium' : 'text-gray-700'}`}>{o}</span>
              </button>
            ))}
          </div>
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

// ── Toggle ───────────────────────────────────────────────────────────────────
const Toggle = ({ value, onChange }) => (
  <button type="button" onClick={() => onChange(!value)}
    className={`relative w-10 h-5 rounded-full transition-all duration-300 focus:outline-none ${value ? 'bg-teal-500' : 'bg-gray-300'}`}>
    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${value ? 'left-5' : 'left-0.5'}`} />
  </button>
);

const Label = ({ children, required }) => (
  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
    {children}{required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

// ── Step card ────────────────────────────────────────────────────────────────
const StepCard = ({ step, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="px-5 py-4 bg-teal-50 border-b border-teal-100 flex items-center gap-3">
      <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
        <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

// ── Main ─────────────────────────────────────────────────────────────────────
export default function ClassesForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    grade: '', section: '', class_name: '', auto_name: true, academic_year: '',
    room_number: '', room_name: '', building: '', floor: '',
    supervisor_id: '', assistant_id: '',
    capacity: '',
  });

  useEffect(() => {
    if (form.auto_name && form.grade && form.section) {
      setForm(p => ({ ...p, class_name: `Class ${form.grade}${form.section}` }));
    }
  }, [form.grade, form.section, form.auto_name]);

  const set = (name, value) => setForm(p => ({ ...p, [name]: value }));
  const handle = (e) => set(e.target.name, e.target.value);

  const canNext = () => {
    if (step === 1) return form.grade && form.section && form.class_name && form.academic_year;
    if (step === 2) return form.room_number && form.building && form.floor;
    if (step === 3) return form.supervisor_id && form.assistant_id;
    if (step === 4) return !!form.capacity;
    return true;
  };

  const submit = () => {
    if (step !== STEPS.length) return;
    setSaving(true);
    setTimeout(() => {
      Swal.fire({ icon: 'success', title: isEdit ? 'Class Updated!' : 'Class Created!', text: `${form.class_name} has been saved successfully.`, confirmButtonColor: '#0d9488', timer: 2000, showConfirmButton: false });
      navigate('/class-management/classes');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-4">
        <div className="max-w-full mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/class-management/classes')}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">{isEdit ? 'Edit Class' : 'New Class Registration'}</h1>
            <p className="text-xs text-teal-100 mt-0.5">Step {step} of {STEPS.length} — {STEPS[step - 1].label}</p>
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
                    ${active ? 'bg-teal-600 text-white shadow-sm' : done ? 'bg-teal-50 text-teal-700 cursor-pointer' : 'bg-gray-100 text-gray-400 cursor-default'}`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0
                    ${active ? 'bg-white/25 text-white' : done ? 'bg-teal-600 text-white' : 'bg-gray-300 text-white'}`}>
                    {done ? <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : s.num}
                  </span>
                  <span className="hidden sm:block">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <div className={`w-4 h-px ${done ? 'bg-teal-400' : 'bg-gray-200'}`} />}
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
              {/* Grade */}
              <div>
                <Label required>Grade Level</Label>
                <SearchSelect
                  options={GRADES}
                  value={form.grade}
                  onChange={(value) => set('grade', value || '')}
                  placeholder="Search or select grade..."
                />
                {form.grade && <p className="text-[11px] text-teal-600 mt-1.5 font-medium">Grade {form.grade} selected</p>}
              </div>

              {/* Section */}
              <div>
                <Label required>Section</Label>
                <SearchSelect
                  options={['A', 'B', 'C', 'D']}
                  value={form.section}
                  onChange={(value) => set('section', value || '')}
                  placeholder="Search or select section..."
                />
                {form.section && <p className="text-[11px] text-teal-600 mt-1.5 font-medium">Section {form.section} selected</p>}
              </div>

              {/* Class Name */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label required>Class Name</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400">Manual</span>
                    <Toggle value={form.auto_name} onChange={v => set('auto_name', v)} />
                    <span className="text-[11px] text-teal-600 font-semibold">Auto</span>
                  </div>
                </div>
                <input type="text" name="class_name" value={form.class_name} onChange={handle}
                  readOnly={form.auto_name} required
                  className={`${inp} ${form.auto_name ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                  placeholder="e.g. Class 6A" />
                {form.auto_name && <p className="text-[10px] text-teal-500 mt-1">Auto-generated from Grade + Section</p>}
              </div>

              {/* Academic Year */}
              <div>
                <Label required>Academic Year</Label>
                <select name="academic_year" value={form.academic_year} onChange={handle} className={inp} required>
                  <option value="">Select Academic Year</option>
                  {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </StepCard>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <StepCard step={STEPS[1]}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Room Number</Label>
                  <input type="text" name="room_number" value={form.room_number} onChange={handle} className={inp} placeholder="e.g. 101" />
                </div>
                <div>
                  <Label>Room Name</Label>
                  <input type="text" name="room_name" value={form.room_name} onChange={handle} className={inp} placeholder="e.g. Science Lab A" />
                </div>
                <div>
                  <Label>Building</Label>
                  <input type="text" name="building" value={form.building} onChange={handle} className={inp} placeholder="e.g. Main Building" />
                </div>
                <div>
                  <Label>Floor</Label>
                  <select name="floor" value={form.floor} onChange={handle} className={inp}>
                    <option value="">Select Floor</option>
                    <option value="Ground">Ground Floor</option>
                    <option value="1">1st Floor</option>
                    <option value="2">2nd Floor</option>
                    <option value="3">3rd Floor</option>
                    <option value="4">4th Floor</option>
                  </select>
                </div>
              </div>
              {(form.building || form.room_number) && (
                <div className="p-4 bg-teal-50 rounded-xl border border-teal-100 flex items-center gap-3">
                  <svg className="w-4 h-4 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                  <p className="text-sm text-teal-800 font-medium">
                    {[form.building, form.floor && `Floor ${form.floor}`, form.room_number && `Room ${form.room_number}`, form.room_name].filter(Boolean).join(' · ')}
                  </p>
                </div>
              )}
            </StepCard>
          )}

          {/* ── Step 3 ── */}
          {step === 3 && (
            <StepCard step={STEPS[2]}>
              <div>
                <Label required>Class Supervisor</Label>
                <SearchSelect
                  options={TEACHERS}
                  value={form.supervisor_id}
                  onChange={v => set('supervisor_id', v)}
                  placeholder="Search supervisor..."
                  getLabel={t => t.name}
                  getValue={t => t.id}
                />
              </div>
              <div>
                <Label required>Assistant Teacher</Label>
                <SearchSelect
                  options={TEACHERS.filter(t => t.id != form.supervisor_id)}
                  value={form.assistant_id}
                  onChange={v => set('assistant_id', v)}
                  placeholder="Search assistant teacher..."
                  getLabel={t => t.name}
                  getValue={t => t.id}
                />
              </div>
            </StepCard>
          )}

          {/* ── Step 4 ── */}
          {step === 4 && (
            <StepCard step={STEPS[3]}>
              <div>
                <Label required>Class Capacity</Label>
                <input type="number" name="capacity" value={form.capacity} onChange={handle} min={1} max={100}
                  className={`${inp} text-center text-xl font-bold`} placeholder="e.g. 30" required />
                <div className="flex gap-2 mt-2.5">
                  {[20, 25, 30, 35, 40].map(n => (
                    <button key={n} type="button" onClick={() => set('capacity', n)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${form.capacity == n ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-400'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              {form.capacity > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Total Seats', value: form.capacity },
                    { label: 'Enrolled',    value: 0 },
                    { label: 'Available',   value: form.capacity },
                  ].map(s => (
                    <div key={s.label} className="p-4 bg-teal-50 rounded-xl border border-teal-100 text-center">
                      <p className="text-[10px] font-semibold text-teal-600 uppercase tracking-wider">{s.label}</p>
                      <p className="text-2xl font-black text-teal-800 mt-1">{s.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Review summary */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5">
                <p className="text-xs font-bold text-gray-700">Review Summary</p>
                {[
                  { label: 'Class',         value: form.class_name },
                  { label: 'Academic Year', value: form.academic_year },
                  { label: 'Location',      value: [form.building, form.room_number && `Room ${form.room_number}`].filter(Boolean).join(', ') || '—' },
                  { label: 'Supervisor',    value: TEACHERS.find(t => t.id == form.supervisor_id)?.name || '—' },
                  { label: 'Assistant',     value: TEACHERS.find(t => t.id == form.assistant_id)?.name || '—' },
                  { label: 'Capacity',      value: form.capacity ? `${form.capacity} students` : '—' },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                    <span className="text-xs text-gray-500">{r.label}</span>
                    <span className="text-xs font-semibold text-gray-800">{r.value}</span>
                  </div>
                ))}
              </div>
            </StepCard>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button type="button"
              onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/class-management/classes')}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              {step === 1 ? 'Cancel' : 'Back'}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {STEPS.map(s => (
                  <div key={s.num} className={`h-1.5 rounded-full transition-all ${s.num === step ? 'w-6 bg-teal-600' : s.num < step ? 'w-3 bg-teal-300' : 'w-3 bg-gray-200'}`} />
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
                  {saving ? 'Saving...' : (isEdit ? 'Update Class' : 'Create Class')}
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
