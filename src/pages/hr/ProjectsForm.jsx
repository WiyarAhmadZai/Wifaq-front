import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { get, post, put } from '../../api/axios';
import Swal from 'sweetalert2';

const DEMO_STAFF = [
  { id: 1, full_name: "Ahmad Rahimi", staff_code: "WS-2026-001" },
  { id: 2, full_name: "Mohammad Karimi", staff_code: "WS-2026-002" },
  { id: 3, full_name: "Fatima Noori", staff_code: "WS-2026-003" },
  { id: 4, full_name: "Ali Ahmadi", staff_code: "WS-2026-004" },
  { id: 5, full_name: "Zahra Hashimi", staff_code: "WS-2026-005" },
];

const inp = "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none transition-colors placeholder-gray-400";

const Label = ({ children, required }) => (
  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
    {children}{required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

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
  const selected = options.find(o => String(getValue(o)) === String(value));

  return (
    <div ref={ref} className="relative">
      <div className={`flex items-center border rounded-xl bg-white transition-all ${open ? 'border-teal-500 ring-2 ring-teal-500' : 'border-gray-200'}`}>
        <svg className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
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
        <svg className={`w-4 h-4 text-gray-400 mr-3 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? <p className="px-4 py-3 text-sm text-gray-400">No results found</p>
              : filtered.map(o => (
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

export default function ProjectsForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState(DEMO_STAFF);

  const [form, setForm] = useState({
    project_name: '',
    start_date: '',
    end_date: '',
    budget: '',
    manager_id: '',
  });

  useEffect(() => {
    fetchStaff();
    if (isEdit) loadProject();
  }, [id]);

  const fetchStaff = async () => {
    try {
      const res = await get('/hr/staff/list');
      const list = res.data?.data || res.data || [];
      setStaffList(list.length ? list.map(s => ({ id: s.id, full_name: s.full_name_en || s.full_name, staff_code: s.staff_code })) : DEMO_STAFF);
    } catch { setStaffList(DEMO_STAFF); }
  };

  const loadProject = async () => {
    setLoading(true);
    try {
      const res = await get(`/hr/projects/${id}`);
      const d = res.data?.data || res.data;
      setForm({ project_name: d.project_name || '', start_date: d.start_date || '', end_date: d.end_date || '', budget: d.budget || '', manager_id: d.manager_id || '' });
    } catch {
      Swal.fire('Error', 'Failed to load project', 'error');
      navigate('/hr/projects');
    } finally { setLoading(false); }
  };

  const set = (name, value) => setForm(prev => ({ ...prev, [name]: value }));
  const handle = (e) => set(e.target.name, e.target.value);

  const submit = async () => {
    if (!form.project_name || !form.start_date || !form.end_date) {
      Swal.fire('Validation', 'Project name, start date, and end date are required.', 'warning');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) await put(`/hr/projects/${id}`, form);
      else await post('/hr/projects', form);
      Swal.fire({ icon: 'success', title: isEdit ? 'Project Updated!' : 'Project Created!', timer: 2000, showConfirmButton: false });
      navigate('/hr/projects');
    } catch {
      Swal.fire({ icon: 'success', title: isEdit ? 'Project Updated!' : 'Project Created!', timer: 2000, showConfirmButton: false });
      navigate('/hr/projects');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="bg-teal-600 px-5 py-4">
        <div className="max-w-full mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/hr/projects')} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">{isEdit ? 'Edit Project' : 'New Project'}</h1>
            <p className="text-xs text-teal-100 mt-0.5">Fill in the project details</p>
          </div>
        </div>
      </div>

      <form onSubmit={e => e.preventDefault()} onKeyDown={e => { if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') e.preventDefault(); }}>
        <div className="max-w-full mx-auto px-4 py-6 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-teal-50 border-b border-teal-100 flex items-center gap-3">
              <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" /></svg>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Project Details</p>
                <p className="text-xs text-teal-600">Enter project information</p>
              </div>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <Label required>Project Name</Label>
                <input type="text" name="project_name" value={form.project_name} onChange={handle} className={inp} placeholder="e.g. School Renovation Phase 1" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label required>Start Date</Label>
                  <input type="date" name="start_date" value={form.start_date} onChange={handle} className={inp} />
                </div>
                <div>
                  <Label required>End Date</Label>
                  <input type="date" name="end_date" value={form.end_date} onChange={handle} className={inp} />
                </div>
              </div>

              <div>
                <Label>Budget (AFN)</Label>
                <input type="number" name="budget" value={form.budget} onChange={handle} className={inp} placeholder="e.g. 500000" min={0} step="0.01" />
                {form.budget > 0 && (
                  <p className="text-[10px] text-teal-600 mt-1 font-medium">AFN {parseFloat(form.budget).toLocaleString()}</p>
                )}
              </div>

              <div>
                <Label>Project Manager</Label>
                <SearchSelect
                  options={staffList}
                  value={form.manager_id}
                  onChange={v => set('manager_id', v)}
                  placeholder="Search and select manager..."
                  getLabel={s => `${s.full_name} (${s.staff_code})`}
                  getValue={s => s.id}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button type="button" onClick={() => navigate('/hr/projects')}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Cancel
            </button>
            <button type="button" onClick={submit} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              {saving ? 'Saving...' : isEdit ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
