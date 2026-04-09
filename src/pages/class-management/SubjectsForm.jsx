import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { get, post, put } from '../../api/axios';
import Swal from 'sweetalert2';
import { handleValidationErrors } from '../../utils/formErrors';

const CATEGORIES = ['Maarif Subjects', 'Taqwayati Mayari', 'Taqwayati Takhasosi'];
const FIELDS = ['Mathematics & Engineering', 'Religious Studies', 'Social Sciences', 'Natural Sciences'];

const inp = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white transition-colors placeholder-gray-400 outline-none';

const Label = ({ children, required }) => (
  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
    {children}{required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

const StepCard = ({ step, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
    <div className="px-5 py-4 bg-teal-50 border-b border-teal-100 rounded-t-2xl flex items-center gap-3">
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
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    grade_id: '', subject_name: '', subject_code: '', category: '', field: '',
    book_name: '', author: '', edition: '', total_pages: '', chapters: '',
    start_date: '', expected_completion_date: '', weekly_hours: '',
  });
  const [grades, setGrades] = useState([]);

  const STEPS = [
    { num: 1, label: 'Basic Information', desc: 'Subject name, code & category' },
    { num: 2, label: 'Specialization', desc: 'Field of study (optional)' },
    { num: 3, label: 'Book Information', desc: 'Textbook details' },
    { num: 4, label: 'Teaching Timeline', desc: 'Schedule & duration' },
  ];

  useEffect(() => {
    (async () => {
      try {
        const res = await get('/grades/list');
        setGrades(res.data?.data || []);
      } catch {}
    })();
    if (isEdit) loadSubject();
  }, [id]);

  const loadSubject = async () => {
    setLoading(true);
    try {
      const res = await get(`/class-management/subjects/show/${id}`);
      const d = res.data?.data || res.data;
      setForm({
        grade_id: d.grade_id || '',
        subject_name: d.subject_name || '', subject_code: d.subject_code || '',
        category: d.category || '', field: d.field || '',
        book_name: d.book_name || '', author: d.author || '',
        edition: d.edition || '', total_pages: d.total_pages || '',
        chapters: d.chapters || '',
        start_date: d.start_date?.split('T')[0] || '',
        expected_completion_date: d.expected_completion_date?.split('T')[0] || '',
        weekly_hours: d.weekly_hours || '',
      });
    } catch {
      Swal.fire('Error', 'Failed to load subject', 'error');
      navigate('/class-management/subjects');
    } finally { setLoading(false); }
  };

  const set = (name, value) => setForm(p => ({ ...p, [name]: value }));
  const handle = (e) => set(e.target.name, e.target.value);

  const canNext = () => {
    if (step === 1) return form.grade_id && form.subject_name && form.subject_code && form.category;
    if (step === 3) return form.book_name && form.author;
    if (step === 4) return form.start_date && form.expected_completion_date && form.weekly_hours;
    return true;
  };

  const submit = async () => {
    if (step !== STEPS.length) return;
    setSaving(true);
    setErrors({});
    try {
      if (isEdit) {
        await put(`/class-management/subjects/update/${id}`, form);
      } else {
        await post('/class-management/subjects/store', form);
      }
      await Swal.fire({ icon: 'success', title: isEdit ? 'Subject Updated!' : 'Subject Created!', timer: 2000, showConfirmButton: false });
      navigate('/class-management/subjects');
    } catch (error) {
      const stepMap = { 1: ['grade_id','subject_name','subject_code','category'], 2: ['field'], 3: ['book_name','author','edition','total_pages','chapters'], 4: ['start_date','expected_completion_date','weekly_hours'] };
      if (!handleValidationErrors(error.response, setErrors, setStep, stepMap)) {
        Swal.fire('Error', error.response?.data?.message || 'Failed to save subject', 'error');
      }
    } finally { setSaving(false); }
  };

  if (loading) return (<div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>);

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="bg-teal-600 px-5 py-4">
        <div className="max-w-full mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/class-management/subjects')} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">{isEdit ? 'Edit Subject' : 'New Subject Registration'}</h1>
            <p className="text-xs text-teal-100 mt-0.5">Step {step} of {STEPS.length} — {STEPS[step - 1].label}</p>
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
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${active ? 'bg-teal-600 text-white shadow-sm' : done ? 'bg-teal-50 text-teal-700 cursor-pointer' : 'bg-gray-100 text-gray-400 cursor-default'}`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${active ? 'bg-white/25 text-white' : done ? 'bg-teal-600 text-white' : 'bg-gray-300 text-white'}`}>
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

      <form onSubmit={e => e.preventDefault()} onKeyDown={e => { if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') e.preventDefault(); }}>
        <div className="max-w-full mx-auto px-4 py-6 space-y-4">

          {step === 1 && (
            <StepCard step={STEPS[0]}>
              <div>
                <Label required>Grade</Label>
                <select name="grade_id" value={form.grade_id} onChange={handle}
                  className={`${inp} ${errors.grade_id ? 'border-red-400' : ''}`}>
                  <option value="">Select Grade</option>
                  {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                {errors.grade_id && <p className="text-[10px] text-red-500 mt-1">{errors.grade_id[0]}</p>}
              </div>
              <div>
                <Label required>Subject Name</Label>
                <input type="text" name="subject_name" value={form.subject_name} onChange={handle} className={`${inp} ${errors.subject_name ? 'border-red-400' : ''}`} placeholder="e.g. Mathematics" />
                {errors.subject_name && <p className="text-[10px] text-red-500 mt-1">{errors.subject_name[0]}</p>}
              </div>
              <div>
                <Label required>Subject Code</Label>
                <input type="text" name="subject_code" value={form.subject_code} onChange={handle} className={`${inp} ${errors.subject_code ? 'border-red-400' : ''}`} placeholder="e.g. MATH-101" />
                {errors.subject_code && <p className="text-[10px] text-red-500 mt-1">{errors.subject_code[0]}</p>}
              </div>
              <div>
                <Label required>Category</Label>
                <select name="category" value={form.category} onChange={handle} className={inp}>
                  <option value="">Select Category</option>
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </StepCard>
          )}

          {step === 2 && (
            <StepCard step={STEPS[1]}>
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-sm text-amber-800 font-medium">This step is only required when Category = "Taqwayati Takhasosi"</p>
              </div>
              <div>
                <Label>Field (Optional)</Label>
                <select name="field" value={form.field} onChange={handle} className={inp}>
                  <option value="">Select Field (Optional)</option>
                  {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <p className="text-xs text-gray-500 mt-1">Only required for "Taqwayati Takhasosi" category</p>
              </div>
            </StepCard>
          )}

          {step === 3 && (
            <StepCard step={STEPS[2]}>
              <div>
                <Label required>Book Name</Label>
                <input type="text" name="book_name" value={form.book_name} onChange={handle} className={inp} placeholder="e.g. Mathematics for Grade 6" />
              </div>
              <div>
                <Label required>Author</Label>
                <input type="text" name="author" value={form.author} onChange={handle} className={inp} placeholder="e.g. Ahmad Karimi" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Edition</Label>
                  <input type="text" name="edition" value={form.edition} onChange={handle} className={inp} placeholder="e.g. 5th Edition" />
                </div>
                <div>
                  <Label>Total Pages</Label>
                  <input type="number" name="total_pages" value={form.total_pages} onChange={handle} className={inp} placeholder="e.g. 250" />
                </div>
              </div>
              <div>
                <Label>Chapters</Label>
                <input type="text" name="chapters" value={form.chapters} onChange={handle} className={inp} placeholder="e.g. 12 Chapters" />
              </div>
            </StepCard>
          )}

          {step === 4 && (
            <StepCard step={STEPS[3]}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label required>Start Date</Label>
                  <input type="date" name="start_date" value={form.start_date} onChange={handle} className={inp} />
                </div>
                <div>
                  <Label required>Expected Completion Date</Label>
                  <input type="date" name="expected_completion_date" value={form.expected_completion_date} onChange={handle} className={inp} />
                </div>
              </div>
              <div>
                <Label required>Weekly Hours</Label>
                <input type="number" name="weekly_hours" value={form.weekly_hours} onChange={handle} className={inp} placeholder="e.g. 4" min="1" max="20" />
                <div className="flex gap-2 mt-2.5">
                  {[2, 3, 4, 5, 6].map(h => (
                    <button key={h} type="button" onClick={() => set('weekly_hours', h)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${form.weekly_hours == h ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-400'}`}>{h}h</button>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5">
                <p className="text-xs font-bold text-gray-700">Review Summary</p>
                {[
                  { label: 'Grade', value: grades.find(g => g.id == form.grade_id)?.name || '—' },
                  { label: 'Subject', value: form.subject_name },
                  { label: 'Code', value: form.subject_code },
                  { label: 'Category', value: form.category || '—' },
                  { label: 'Field', value: form.field || '—' },
                  { label: 'Book', value: form.book_name || '—' },
                  { label: 'Weekly Hours', value: form.weekly_hours ? `${form.weekly_hours} hours` : '—' },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                    <span className="text-xs text-gray-500">{r.label}</span>
                    <span className="text-xs font-semibold text-gray-800">{r.value}</span>
                  </div>
                ))}
              </div>
            </StepCard>
          )}

          <div className="flex items-center justify-between">
            <button type="button" onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/class-management/subjects')}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              {step === 1 ? 'Cancel' : 'Back'}
            </button>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {STEPS.map(s => (<div key={s.num} className={`h-1.5 rounded-full transition-all ${s.num === step ? 'w-6 bg-teal-600' : s.num < step ? 'w-3 bg-teal-300' : 'w-3 bg-gray-200'}`} />))}
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
