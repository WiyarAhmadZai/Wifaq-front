import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';

const CLASSES = [
  { id: 1, name: 'Class 1A' },
  { id: 2, name: 'Class 1B' },
  { id: 3, name: 'Class 2A' },
  { id: 4, name: 'Class 2B' },
  { id: 5, name: 'Class 3A' },
  { id: 6, name: 'Class 3B' },
  { id: 7, name: 'Class 4A' },
  { id: 8, name: 'Class 4B' },
  { id: 9, name: 'Class 5A' },
  { id: 10, name: 'Class 5B' },
  { id: 11, name: 'Class 6A' },
  { id: 12, name: 'Class 6B' },
];

const TEACHERS = [
  { id: 1, name: 'Ahmad Karimi' },
  { id: 2, name: 'Fatima Ahmadi' },
  { id: 3, name: 'Noor Rahman' },
  { id: 4, name: 'Maryam Sultani' },
  { id: 5, name: 'Khalid Noori' },
];

const CATEGORIES = [
  'Maarif Subjects',
  'Taqwayati Mayari',
  'Taqwayati Takhasosi'
];

const FIELDS = [
  'Mathematics & Engineering',
  'Religious Studies',
  'Social Sciences',
  'Natural Sciences'
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

const Label = ({ children, required }) => (
  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
    {children}{required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

const StepCard = ({ step, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="px-5 py-4 bg-teal-50 border-b border-teal-100 flex items-center gap-3">
      <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
        <span className="text-white font-bold text-sm">{step.num}</span>
      </div>
      <div>
        <p className="text-sm font-bold text-gray-800">{step.label}</p>
        <p className="text-xs text-teal-600">{step.desc}</p>
      </div>
    </div>
    <div className="p-5 space-y-5">{children}</div>
  </div>
);

export default function SubjectsForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    subjectName: '',
    subjectCode: '',
    category: '',
    field: '',
    bookName: '',
    author: '',
    edition: '',
    totalPages: '',
    chapters: '',
    startDate: '',
    expectedCompletionDate: '',
    weeklyHours: '',
  });

  const STEPS = [
    { num: 1, label: 'Basic Information', desc: 'Subject name, code & category', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { num: 2, label: 'Specialization', desc: 'Field of study (optional)', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { num: 3, label: 'Book Information', desc: 'Textbook details', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { num: 4, label: 'Teaching Timeline', desc: 'Schedule & duration', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  ];

  const set = (name, value) => setForm(p => ({ ...p, [name]: value }));
  const handle = (e) => set(e.target.name, e.target.value);

  const canNext = () => {
    if (step === 1) return form.subjectName && form.subjectCode && form.category;
    if (step === 2) return true; // Specialization is optional
    if (step === 3) return form.bookName && form.author;
    if (step === 4) return form.startDate && form.expectedCompletionDate && form.weeklyHours;
    return true;
  };

  const submit = () => {
    if (step !== STEPS.length) return;
    setSaving(true);
    setTimeout(() => {
      Swal.fire({ 
        icon: 'success', 
        title: isEdit ? 'Subject Updated!' : 'Subject Created!', 
        text: `${form.subjectName} has been saved successfully.`, 
        confirmButtonColor: '#0d9488', 
        timer: 2000, 
        showConfirmButton: false 
      });
      navigate('/class-management/subjects');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-4">
        <div className="max-w-full mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/class-management/subjects')}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">{isEdit ? 'Edit Subject' : 'New Subject Registration'}</h1>
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
              <div>
                <Label required>Subject Name</Label>
                <input type="text" name="subjectName" value={form.subjectName} onChange={handle} 
                  className={inp} placeholder="e.g. Mathematics" required />
              </div>

              <div>
                <Label required>Subject Code</Label>
                <input type="text" name="subjectCode" value={form.subjectCode} onChange={handle} 
                  className={inp} placeholder="e.g. MATH101" required />
              </div>

              <div>
                <Label required>Category</Label>
                <select name="category" value={form.category} onChange={handle} className={inp} required>
                  <option value="">Select Category</option>
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </StepCard>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <StepCard step={STEPS[1]}>
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-sm text-amber-800 font-medium">
                  This step is only required when Category = "Taqwayati Takhasosi"
                </p>
              </div>

              <div>
                <Label>Field (Optional)</Label>
                <select name="field" value={form.field} onChange={handle} className={inp}>
                  <option value="">Select Field (Optional)</option>
                  {FIELDS.map(field => <option key={field} value={field}>{field}</option>)}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Only required for "Taqwayati Takhasosi" category
                </p>
              </div>
            </StepCard>
          )}

          {/* ── Step 3 ── */}
          {step === 3 && (
            <StepCard step={STEPS[2]}>
              <div>
                <Label required>Book Name</Label>
                <input type="text" name="bookName" value={form.bookName} onChange={handle} 
                  className={inp} placeholder="e.g. Mathematics for Grade 6" required />
              </div>

              <div>
                <Label required>Author</Label>
                <input type="text" name="author" value={form.author} onChange={handle} 
                  className={inp} placeholder="e.g. John Smith" required />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Edition</Label>
                  <input type="text" name="edition" value={form.edition} onChange={handle} 
                    className={inp} placeholder="e.g. 5th Edition" />
                </div>
                <div>
                  <Label>Total Pages</Label>
                  <input type="number" name="totalPages" value={form.totalPages} onChange={handle} 
                    className={inp} placeholder="e.g. 250" />
                </div>
              </div>

              <div>
                <Label>Chapters</Label>
                <input type="text" name="chapters" value={form.chapters} onChange={handle} 
                  className={inp} placeholder="e.g. 12 Chapters" />
              </div>
            </StepCard>
          )}

          {/* ── Step 4 ── */}
          {step === 4 && (
            <StepCard step={STEPS[3]}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label required>Start Date</Label>
                  <input type="date" name="startDate" value={form.startDate} onChange={handle} 
                    className={inp} required />
                </div>
                <div>
                  <Label required>Expected Completion Date</Label>
                  <input type="date" name="expectedCompletionDate" value={form.expectedCompletionDate} onChange={handle} 
                    className={inp} required />
                </div>
              </div>

              <div>
                <Label required>Weekly Hours</Label>
                <input type="number" name="weeklyHours" value={form.weeklyHours} onChange={handle} 
                  className={inp} placeholder="e.g. 4" min="1" max="20" required />
                <div className="flex gap-2 mt-2.5">
                  {[2, 3, 4, 5, 6].map(hours => (
                    <button key={hours} type="button" onClick={() => set('weeklyHours', hours)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${form.weeklyHours == hours ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-400'}`}>
                      {hours}h
                    </button>
                  ))}
                </div>
              </div>

              {/* Review summary */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5">
                <p className="text-xs font-bold text-gray-700">Review Summary</p>
                {[
                  { label: 'Subject', value: form.subjectName },
                  { label: 'Code', value: form.subjectCode },
                  { label: 'Category', value: form.category || '—' },
                  { label: 'Field', value: form.field || '—' },
                  { label: 'Book', value: form.bookName || '—' },
                  { label: 'Weekly Hours', value: form.weeklyHours ? `${form.weeklyHours} hours` : '—' },
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
              onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/class-management/subjects')}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
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
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              ) : (
                <button type="button" onClick={submit} disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {saving ? 'Saving...' : (isEdit ? 'Update Subject' : 'Create Subject')}
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
