import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { get, post, put } from '../../api/axios';
import Swal from 'sweetalert2';

const SECTIONS = ['A', 'B', 'C', 'D', 'E'];

const STEPS = [
  { num: 1, label: 'Basic Info', desc: 'Grade, section, name & year', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { num: 2, label: 'Location', desc: 'Room, building & floor', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' },
  { num: 3, label: 'Administration', desc: 'Supervisor & assistant', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { num: 4, label: 'Capacity', desc: 'Review & confirm', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
];

const inp = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white transition-colors placeholder-gray-400 outline-none';

function SearchSelect({ options, value, onChange, placeholder = 'Select...', getLabel = o => o, getValue = o => o }) {
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
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">No results</p>
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

const StepCard = ({ step, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
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

export default function ClassesForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [errors, setErrors] = useState({});

  // Map each field to the step it belongs to
  const FIELD_TO_STEP = {
    grade_id: 1, section: 1, shift: 1, class_name: 1, academic_term_id: 1,
    room_number: 2, room_name: 2, building: 2, floor: 2,
    supervisor_id: 3, assistant_id: 3,
    capacity: 4, status: 4,
  };

  const err = (f) => errors[f]?.[0];

  const [form, setForm] = useState({
    grade_id: '', section: '', shift: 'morning', class_name: '', auto_name: true, academic_term_id: '',
    room_number: '', room_name: '', building: '', floor: '',
    supervisor_id: '', assistant_id: '',
    capacity: 30, status: 'active',
  });

  const [grades, setGrades] = useState([]);
  const [academicTerms, setAcademicTerms] = useState([]);
  const [staff, setStaff] = useState([]);

  useEffect(() => {
    (async () => {
      setLoadingData(true);
      try {
        const res = await get('/class-management/classes/form-data');
        setGrades(res.data?.grades || []);
        console.log(res.data?.grades);
        setAcademicTerms(res.data?.academic_terms || []);
        setStaff(res.data?.staff || []);
      } catch {}

      if (isEdit) {
        try {
          const res = await get(`/class-management/classes/show/${id}`);
          const d = res.data?.data;
          if (d) {
            setForm({
              grade_id: d.grade?.id || '', section: d.section || '', shift: d.shift || 'morning', class_name: d.class_name || '', auto_name: false,
              academic_term_id: d.academic_term?.id || '',
              room_number: d.room_number || '', room_name: d.room_name || '', building: d.building || '', floor: d.floor || '',
              supervisor_id: d.supervisor?.id || '', assistant_id: d.assistant?.id || '',
              capacity: d.capacity || 30, status: d.status || 'active',
            });
          }
        } catch {
          Swal.fire('Error', 'Failed to load class data', 'error');
          navigate('/class-management/classes');
        }
      }
      setLoadingData(false);
    })();
  }, [id]);

  useEffect(() => {
    if (form.auto_name && form.grade_id && form.section) {
      const grade = grades.find(g => g.id == form.grade_id);
      const shiftLabel = form.shift === 'afternoon' ? ' (PM)' : '';
      if (grade) setForm(p => ({ ...p, class_name: `${grade.name} - ${form.section}${shiftLabel}` }));
    }
  }, [form.grade_id, form.section, form.shift, form.auto_name, grades]);

  const set = (name, value) => {
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
  };
  const handle = (e) => set(e.target.name, e.target.value);

  const canNext = () => {
    if (step === 1) return form.grade_id && form.section && form.class_name && form.academic_term_id;
    if (step === 2) return true;
    if (step === 3) return true;
    if (step === 4) return !!form.capacity;
    return true;
  };

  const submit = async () => {
    if (step !== STEPS.length) return;
    setSaving(true);
    setErrors({});
    try {
      const payload = {
        ...form,
        supervisor_id: form.supervisor_id || null,
        assistant_id: form.assistant_id || null,
      };
      delete payload.auto_name;

      if (isEdit) {
        await put(`/class-management/classes/update/${id}`, payload);
      } else {
        await post('/class-management/classes/store', payload);
      }
      Swal.fire({ icon: 'success', title: isEdit ? 'Class Updated!' : 'Class Created!', timer: 2000, showConfirmButton: false });
      navigate('/class-management/classes');
    } catch (error) {
      const responseErrors = error.response?.data?.errors;
      const message = error.response?.data?.message || 'Failed to save class';

      if (responseErrors && typeof responseErrors === 'object') {
        setErrors(responseErrors);
        // Navigate to the first step that has an error
        const firstErrorField = Object.keys(responseErrors)[0];
        const targetStep = FIELD_TO_STEP[firstErrorField];
        if (targetStep) setStep(targetStep);

        // Build a clear list of errors for the alert
        const errorList = Object.values(responseErrors)
          .map(msgs => `• ${Array.isArray(msgs) ? msgs[0] : msgs}`)
          .join('<br>');

        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          html: `<div class="text-left text-sm">${errorList}</div>`,
          confirmButtonColor: '#0d9488',
        });
      } else {
        Swal.fire('Error', message, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-100 border-t-teal-600"></div>
          <span className="text-gray-500 text-sm">Loading...</span>
        </div>
      </div>
    );
  }

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

          {/* Validation Error Banner */}
          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-800">Please fix the following errors:</p>
                  <ul className="mt-1.5 space-y-1">
                    {Object.entries(errors).map(([field, msgs]) => {
                      const stepNum = FIELD_TO_STEP[field];
                      const stepLabel = stepNum ? STEPS[stepNum - 1].label : '';
                      return (
                        <li key={field} className="text-xs text-red-700 flex items-start gap-1.5">
                          <span className="text-red-400">•</span>
                          <span>
                            {Array.isArray(msgs) ? msgs[0] : msgs}
                            {stepNum && stepNum !== step && (
                              <button type="button" onClick={() => setStep(stepNum)}
                                className="ml-2 text-red-600 underline font-semibold">Go to {stepLabel}</button>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <StepCard step={STEPS[0]}>
              <div>
                <Label required>Grade Level</Label>
                <SearchSelect options={grades} value={form.grade_id} onChange={v => set('grade_id', v || '')}
                  placeholder="Select grade..." getLabel={g => g.name} getValue={g => g.id} />
                {(() => {
                  const selectedGrade = grades.find(g => g.id == form.grade_id);
                  if (selectedGrade?.is_primary) {
                    return (
                      <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                        <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-[11px] text-amber-800 leading-relaxed">
                          <strong>Primary Grade:</strong> This is a primary grade where one teacher (the supervisor) teaches all subjects. The supervisor is locked to this class for the entire shift but can supervise a different class in another shift.
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label required>Section</Label>
                  <SearchSelect options={SECTIONS} value={form.section} onChange={v => set('section', v || '')} placeholder="Select section..." />
                </div>
                <div>
                  <Label required>Shift</Label>
                  <div className="flex gap-2">
                    {[{ value: 'morning', label: 'Morning', icon: '☀️' }, { value: 'afternoon', label: 'Afternoon', icon: '🌙' }].map(s => (
                      <button key={s.value} type="button" onClick={() => set('shift', s.value)}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium border transition-all flex items-center justify-center gap-2 ${
                          form.shift === s.value ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'
                        }`}>
                        <span>{s.icon}</span> {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
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
                  placeholder="e.g. Grade 6 - A" />
              </div>
              <div>
                <Label required>Academic Term</Label>
                <SearchSelect options={academicTerms} value={form.academic_term_id} onChange={v => set('academic_term_id', v || '')}
                  placeholder="Select academic term..." getLabel={t => t.name} getValue={t => t.id} />
              </div>
            </StepCard>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <StepCard step={STEPS[1]}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Room Number</Label>
                  <input type="text" name="room_number" value={form.room_number} onChange={handle}
                    className={`${inp} ${err('room_number') ? 'border-red-400 focus:ring-red-400' : ''}`} placeholder="e.g. 101" />
                  {err('room_number') && <p className="text-red-500 text-[10px] mt-1">{err('room_number')}</p>}
                </div>
                <div>
                  <Label>Room Name</Label>
                  <input type="text" name="room_name" value={form.room_name} onChange={handle} className={inp} placeholder="e.g. Science Lab A" />
                </div>
                <div>
                  <Label>Building</Label>
                  <input type="text" name="building" value={form.building} onChange={handle}
                    className={`${inp} ${err('building') ? 'border-red-400 focus:ring-red-400' : ''}`} placeholder="e.g. Main Building" />
                  {err('building') && <p className="text-red-500 text-[10px] mt-1">{err('building')}</p>}
                </div>
                <div>
                  <Label>Floor</Label>
                  <select name="floor" value={form.floor} onChange={handle}
                    className={`${inp} ${err('floor') ? 'border-red-400 focus:ring-red-400' : ''}`}>
                    <option value="">Select Floor</option>
                    <option value="Ground">Ground Floor</option>
                    <option value="1">1st Floor</option>
                    <option value="2">2nd Floor</option>
                    <option value="3">3rd Floor</option>
                    <option value="4">4th Floor</option>
                  </select>
                  {err('floor') && <p className="text-red-500 text-[10px] mt-1">{err('floor')}</p>}
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

          {/* Step 3: Administration */}
          {step === 3 && (
            <StepCard step={STEPS[2]}>
              <div>
                <Label>Class Supervisor</Label>
                <div className={err('supervisor_id') ? 'ring-2 ring-red-400 rounded-xl' : ''}>
                  <SearchSelect options={staff} value={form.supervisor_id} onChange={v => set('supervisor_id', v || '')}
                    placeholder="Search supervisor..." getLabel={t => t.name} getValue={t => t.id} />
                </div>
                {err('supervisor_id') && (
                  <div className="mt-1.5 p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <svg className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-[10px] text-red-700">{err('supervisor_id')}</p>
                  </div>
                )}
              </div>
              <div>
                <Label>Assistant Teacher</Label>
                <SearchSelect options={staff.filter(t => t.id != form.supervisor_id)} value={form.assistant_id}
                  onChange={v => set('assistant_id', v || '')} placeholder="Search assistant..."
                  getLabel={t => t.name} getValue={t => t.id} />
                {err('assistant_id') && <p className="text-red-500 text-[10px] mt-1">{err('assistant_id')}</p>}
              </div>
            </StepCard>
          )}

          {/* Step 4: Capacity & Review */}
          {step === 4 && (
            <StepCard step={STEPS[3]}>
              <div>
                <Label required>Class Capacity</Label>
                <input type="number" name="capacity" value={form.capacity} onChange={handle} min={1} max={200}
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

              {/* Review */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5">
                <p className="text-xs font-bold text-gray-700">Review Summary</p>
                {[
                  { label: 'Class', value: form.class_name },
                  { label: 'Grade', value: grades.find(g => g.id == form.grade_id)?.name || '—' },
                  { label: 'Section', value: form.section || '—' },
                  { label: 'Shift', value: form.shift === 'morning' ? 'Morning' : 'Afternoon' },
                  { label: 'Academic Term', value: academicTerms.find(t => t.id == form.academic_term_id)?.name || '—' },
                  { label: 'Location', value: [form.building, form.room_number && `Room ${form.room_number}`].filter(Boolean).join(', ') || '—' },
                  { label: 'Supervisor', value: staff.find(t => t.id == form.supervisor_id)?.name || '—' },
                  { label: 'Assistant', value: staff.find(t => t.id == form.assistant_id)?.name || '—' },
                  { label: 'Capacity', value: form.capacity ? `${form.capacity} students` : '—' },
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
