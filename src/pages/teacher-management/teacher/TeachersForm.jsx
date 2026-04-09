import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { get, post, put } from '../../../api/axios';
import Swal from 'sweetalert2';

const inp = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white transition-colors placeholder-gray-400 outline-none';

function SearchSelect({ options, value, onChange, placeholder = 'Select...', getLabel = o => o, getValue = o => o, error }) {
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
      <div className={`flex items-center border rounded-xl bg-white transition-all ${open ? 'border-teal-500 ring-2 ring-teal-500' : error ? 'border-red-400' : 'border-gray-200'}`}>
        <svg className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={open ? query : (selected ? getLabel(selected) : '')}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); setQuery(''); }}
          placeholder={selected ? getLabel(selected) : placeholder}
          className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none placeholder-gray-400"
        />
        {selected && !open && (
          <button type="button" onClick={() => { onChange(''); setQuery(''); }} className="mr-2 w-4 h-4 text-gray-400 hover:text-gray-600 flex-shrink-0">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">No results</p>
            ) : filtered.map(o => (
              <button key={getValue(o)} type="button" onClick={() => { onChange(getValue(o)); setOpen(false); setQuery(''); }}
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

export default function TeachersForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    staff_id: '',
    weekly_hours: 20,
  });
  const [availableStaff, setAvailableStaff] = useState([]);
  const [currentStaff, setCurrentStaff] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (isEdit) {
          const res = await get(`/teacher-management/teachers/show/${id}`);
          const d = res.data?.data;
          if (d) {
            setForm({ staff_id: d.staff_id, weekly_hours: d.weekly_hours || 20 });
            setCurrentStaff({ id: d.staff_id, name: d.name, email: d.email, role: d.role });
          }
        } else {
          const res = await get('/teacher-management/teachers/available-staff');
          setAvailableStaff(res.data?.data || []);
        }
      } catch (error) {
        Swal.fire('Error', 'Failed to load data', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const set = (name, value) => {
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
  };

  const submit = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      if (isEdit) {
        await put(`/teacher-management/teachers/update/${id}`, { weekly_hours: form.weekly_hours });
      } else {
        await post('/teacher-management/teachers/store', form);
      }
      Swal.fire({ icon: 'success', title: isEdit ? 'Teacher Updated!' : 'Teacher Added!', timer: 1500, showConfirmButton: false });
      navigate('/teacher-management/teachers');
    } catch (error) {
      const responseErrors = error.response?.data?.errors;
      if (responseErrors) {
        setErrors(responseErrors);
      }
      Swal.fire('Error', error.response?.data?.message || (responseErrors ? Object.values(responseErrors).flat()[0] : 'Failed to save'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-100 border-t-teal-600"></div>
      </div>
    );
  }

  const selectedStaff = availableStaff.find(s => s.id == form.staff_id);

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/teacher-management/teachers')} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">{isEdit ? 'Edit Teacher' : 'Add New Teacher'}</h1>
            <p className="text-xs text-teal-100 mt-0.5">Register an academic staff member as a teacher</p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 bg-teal-50 border-b border-teal-100 rounded-t-2xl flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">Teacher Details</p>
              <p className="text-xs text-teal-600">Only academic staff members can be added</p>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Staff Selection (only for create mode) */}
            {!isEdit ? (
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Select Staff Member <span className="text-red-400">*</span>
                </label>
                <SearchSelect
                  options={availableStaff}
                  value={form.staff_id}
                  onChange={v => set('staff_id', v || '')}
                  placeholder="Search academic staff..."
                  getLabel={s => `${s.name}${s.role ? ' — ' + s.role : ''}`}
                  getValue={s => s.id}
                  error={errors.staff_id}
                />
                {errors.staff_id && <p className="text-red-500 text-[10px] mt-1">{errors.staff_id[0]}</p>}
                {availableStaff.length === 0 && (
                  <p className="text-xs text-amber-700 mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    No academic staff available. All academic staff are already registered as teachers, or you need to add staff with department = "academic" first.
                  </p>
                )}

                {selectedStaff && (
                  <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-xl">
                    <p className="text-[10px] font-semibold text-teal-700 uppercase mb-1">Selected Staff</p>
                    <p className="text-sm font-bold text-gray-800">{selectedStaff.name}</p>
                    {selectedStaff.email && <p className="text-xs text-gray-500">{selectedStaff.email}</p>}
                    {selectedStaff.role && <p className="text-xs text-teal-700 mt-1">{selectedStaff.role}</p>}
                  </div>
                )}
              </div>
            ) : (
              currentStaff && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Staff Member</p>
                  <p className="text-sm font-bold text-gray-800">{currentStaff.name}</p>
                  {currentStaff.email && <p className="text-xs text-gray-500">{currentStaff.email}</p>}
                  {currentStaff.role && <p className="text-xs text-teal-700 mt-1">{currentStaff.role}</p>}
                </div>
              )
            )}

            {/* Weekly Hours */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Weekly Teaching Hours <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={form.weekly_hours}
                onChange={e => set('weekly_hours', e.target.value)}
                min="1"
                max="60"
                placeholder="e.g. 20"
                className={`${inp} text-center text-xl font-bold ${errors.weekly_hours ? 'border-red-400' : ''}`}
              />
              <div className="flex gap-2 mt-2.5">
                {[15, 20, 25, 30, 40].map(h => (
                  <button key={h} type="button" onClick={() => set('weekly_hours', h)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${form.weekly_hours == h ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-400'}`}>
                    {h}h
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">Maximum hours this teacher can teach per week</p>
              {errors.weekly_hours && <p className="text-red-500 text-[10px] mt-1">{errors.weekly_hours[0]}</p>}
            </div>
          </div>

          <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 rounded-b-2xl flex justify-end gap-3">
            <button type="button" onClick={() => navigate('/teacher-management/teachers')}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving || (!isEdit && !form.staff_id) || !form.weekly_hours}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2">
              {saving ? (
                <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
              ) : (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{isEdit ? 'Update Teacher' : 'Add Teacher'}</>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
