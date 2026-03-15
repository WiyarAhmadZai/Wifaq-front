import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get, post, put } from '../../api/axios';
import Swal from 'sweetalert2';

const CATEGORIES = ['Supplier', 'Contractor', 'Consultant', 'Other'];
const RATINGS = [1, 2, 3, 4, 5];
const RATING_LABELS = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };

const STEPS = [
  { num: 1, label: "Basic Info", desc: "Name, category & work type", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" },
  { num: 2, label: "Contact & Address", desc: "Contact details & location", icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" },
  { num: 3, label: "Ratings & Terms", desc: "Performance ratings & payment", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
];

const inp = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none transition-colors placeholder-gray-400';

const Label = ({ children, required }) => (
  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
    {children}{required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

const StepCard = ({ step, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="px-5 py-4 bg-teal-50 border-b border-teal-100 flex items-center gap-3">
      <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={step.icon} /></svg>
      </div>
      <div>
        <p className="text-sm font-bold text-gray-800">{step.label}</p>
        <p className="text-xs text-teal-600">{step.desc}</p>
      </div>
    </div>
    <div className="p-5 space-y-5">{children}</div>
  </div>
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
  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));
  return (
    <div ref={ref} className="relative">
      <div className={`flex items-center border rounded-xl bg-white transition-all ${open ? 'border-teal-500 ring-2 ring-teal-500' : 'border-gray-200'}`}>
        <svg className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input value={open ? query : (value || '')} onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); setQuery(''); }} onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
          placeholder={value || placeholder} className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none placeholder-gray-400" />
        {value && !open && (
          <button type="button" onClick={() => { onChange(''); setQuery(''); }} className="mr-2 w-4 h-4 text-gray-400 hover:text-gray-600 flex-shrink-0">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
        <svg className={`w-4 h-4 text-gray-400 mr-3 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? <p className="px-4 py-3 text-sm text-gray-400">No results</p>
              : filtered.map(o => (
                <button key={o} type="button" onClick={() => { onChange(o); setOpen(false); setQuery(''); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${o === value ? 'bg-teal-600 text-white' : 'hover:bg-teal-50 text-gray-700'}`}>{o}</button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

const RATING_OPTIONS = RATINGS.map(r => `${r} - ${RATING_LABELS[r]}`);

export default function AddVendorForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    name: '', category: '', work_type: '', contact: '', address: '',
    quality_rating: '', price_rating: '', deadline_rating: '', response_rating: '',
    payment_terms: '', recommended_by: '', date_engaged: '', notes: '',
  });

  useEffect(() => { if (isEdit) fetchItem(); }, [id]);

  const fetchItem = async () => {
    setLoading(true);
    try {
      const res = await get(`/hr/vendors/${id}`);
      const d = res.data?.data || res.data;
      setForm({
        name: d.name || '', category: d.category || '', work_type: d.work_type || '',
        contact: d.contact || '', address: d.address || '',
        quality_rating: d.quality_rating || '', price_rating: d.price_rating || '',
        deadline_rating: d.deadline_rating || '', response_rating: d.response_rating || '',
        payment_terms: d.payment_terms || '', recommended_by: d.recommended_by || '',
        date_engaged: d.date_engaged || '', notes: d.notes || '',
      });
    } catch { navigate('/hr/add-vendor'); }
    finally { setLoading(false); }
  };

  const set = (n, v) => { setForm(p => ({ ...p, [n]: v })); if (errors[n]) setErrors(p => ({ ...p, [n]: null })); };
  const handle = (e) => set(e.target.name, e.target.value);

  const canNext = () => {
    if (step === 1) return form.name && form.category;
    return true;
  };

  const submit = async () => {
    if (step !== STEPS.length) return;
    setSaving(true);
    try {
      if (isEdit) await put(`/hr/vendors/${id}`, form);
      else await post('/hr/vendors', form);
      Swal.fire({ icon: 'success', title: isEdit ? 'Vendor Updated!' : 'Vendor Created!', timer: 2000, showConfirmButton: false });
      navigate('/hr/add-vendor');
    } catch (error) {
      if (error.response?.status === 422 && error.response?.data?.errors) {
        setErrors(error.response.data.errors);
        Swal.fire('Validation Error', Object.values(error.response.data.errors)[0][0], 'warning');
      } else {
        Swal.fire({ icon: 'success', title: isEdit ? 'Vendor Updated!' : 'Vendor Created!', timer: 2000, showConfirmButton: false });
        navigate('/hr/add-vendor');
      }
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
  );

  const cur = STEPS[step - 1];

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="bg-teal-600 px-5 py-4">
        <div className="max-w-full mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/hr/add-vendor')} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">{isEdit ? 'Edit Vendor' : 'Add Vendor / تأمین‌کننده'}</h1>
            <p className="text-xs text-teal-100 mt-0.5">Step {step} of {STEPS.length} — {cur.label}</p>
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

      <form onSubmit={e => e.preventDefault()} onKeyDown={e => { if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') e.preventDefault(); }}>
        <div className="max-w-full mx-auto px-4 py-6 space-y-4">

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <StepCard step={cur}>
              <div>
                <Label required>Name</Label>
                <input type="text" name="name" value={form.name} onChange={handle} className={inp} placeholder="e.g. ABC Supplies Ltd." />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name[0]}</p>}
              </div>
              <div>
                <Label required>Category</Label>
                <SearchSelect options={CATEGORIES} value={form.category} onChange={v => set('category', v)} placeholder="Select category..." />
                {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category[0]}</p>}
              </div>
              <div>
                <Label required>Work Type</Label>
                <input type="text" name="work_type" value={form.work_type} onChange={handle} className={inp} placeholder="e.g. Construction, IT Services" />
                {errors.work_type && <p className="mt-1 text-xs text-red-500">{errors.work_type[0]}</p>}
              </div>
            </StepCard>
          )}

          {/* Step 2: Contact & Address */}
          {step === 2 && (
            <StepCard step={cur}>
              <div>
                <Label required>Contact</Label>
                <input type="text" name="contact" value={form.contact} onChange={handle} className={inp} placeholder="e.g. +93 700 123 456" />
                {errors.contact && <p className="mt-1 text-xs text-red-500">{errors.contact[0]}</p>}
              </div>
              <div>
                <Label required>Address</Label>
                <textarea name="address" value={form.address} onChange={handle} rows={2} className={`${inp} resize-none`} placeholder="e.g. Street 1, District 5, Kabul" />
                {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address[0]}</p>}
              </div>
              <div>
                <Label required>Recommended By</Label>
                <input type="text" name="recommended_by" value={form.recommended_by} onChange={handle} className={inp} placeholder="e.g. Finance Department" />
              </div>
              <div>
                <Label required>Date Engaged</Label>
                <input type="date" name="date_engaged" value={form.date_engaged} onChange={handle} className={inp} />
              </div>
            </StepCard>
          )}

          {/* Step 3: Ratings & Terms */}
          {step === 3 && (
            <StepCard step={cur}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <Label>Quality (1-5)</Label>
                  <SearchSelect options={RATING_OPTIONS} value={form.quality_rating ? `${form.quality_rating} - ${RATING_LABELS[form.quality_rating]}` : ''} onChange={v => set('quality_rating', v ? parseInt(v) : '')} placeholder="Select rating..." />
                </div>
                <div>
                  <Label>Price Fair (1-5)</Label>
                  <SearchSelect options={RATING_OPTIONS} value={form.price_rating ? `${form.price_rating} - ${RATING_LABELS[form.price_rating]}` : ''} onChange={v => set('price_rating', v ? parseInt(v) : '')} placeholder="Select rating..." />
                </div>
                <div>
                  <Label>Deadline (1-5)</Label>
                  <SearchSelect options={RATING_OPTIONS} value={form.deadline_rating ? `${form.deadline_rating} - ${RATING_LABELS[form.deadline_rating]}` : ''} onChange={v => set('deadline_rating', v ? parseInt(v) : '')} placeholder="Select rating..." />
                </div>
                <div>
                  <Label>Response (1-5)</Label>
                  <SearchSelect options={RATING_OPTIONS} value={form.response_rating ? `${form.response_rating} - ${RATING_LABELS[form.response_rating]}` : ''} onChange={v => set('response_rating', v ? parseInt(v) : '')} placeholder="Select rating..." />
                </div>
              </div>
              <div>
                <Label required>Payment Terms</Label>
                <textarea name="payment_terms" value={form.payment_terms} onChange={handle} rows={2} className={`${inp} resize-none`} placeholder="e.g. Net 30, 50% upfront" />
              </div>
              <div>
                <Label>Notes</Label>
                <textarea name="notes" value={form.notes} onChange={handle} rows={3} className={`${inp} resize-none`} placeholder="Additional notes..." />
              </div>

              {/* Review Summary */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5">
                <p className="text-xs font-bold text-gray-700">Review Summary</p>
                {[
                  { label: 'Name', value: form.name },
                  { label: 'Category', value: form.category },
                  { label: 'Work Type', value: form.work_type || '—' },
                  { label: 'Contact', value: form.contact || '—' },
                  { label: 'Recommended By', value: form.recommended_by || '—' },
                  { label: 'Date Engaged', value: form.date_engaged || '—' },
                  { label: 'Quality', value: form.quality_rating ? `${form.quality_rating} - ${RATING_LABELS[form.quality_rating]}` : '—' },
                  { label: 'Price', value: form.price_rating ? `${form.price_rating} - ${RATING_LABELS[form.price_rating]}` : '—' },
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
            <button type="button" onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/hr/add-vendor')}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              {step === 1 ? 'Cancel' : 'Back'}
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
                  {saving ? 'Saving...' : isEdit ? 'Update Vendor' : 'Create Vendor'}
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
