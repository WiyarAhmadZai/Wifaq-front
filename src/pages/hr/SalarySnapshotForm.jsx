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

export default function SalarySnapshotForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState(DEMO_STAFF);

  const [form, setForm] = useState({
    staff_id: '',
    snapshot_month: new Date().toISOString().slice(0, 7) + '-01',
    rank_level: '',
    base_salary: '',
    housing_allowance: '',
    transport_allowance: '',
    family_allowance: '',
    other_allowances: '',
    reason: '',
  });

  const total = (parseFloat(form.base_salary) || 0) + (parseFloat(form.housing_allowance) || 0) + (parseFloat(form.transport_allowance) || 0) + (parseFloat(form.family_allowance) || 0) + (parseFloat(form.other_allowances) || 0);

  useEffect(() => {
    fetchStaff();
    if (isEdit) loadSnapshot();
  }, [id]);

  const fetchStaff = async () => {
    try {
      const res = await get('/hr/staff/list');
      const list = res.data?.data || res.data || [];
      setStaffList(list.length ? list.map(s => ({ id: s.id, full_name: s.full_name_en || s.full_name, staff_code: s.staff_code })) : DEMO_STAFF);
    } catch { setStaffList(DEMO_STAFF); }
  };

  const loadSnapshot = async () => {
    setLoading(true);
    try {
      const res = await get(`/hr/salary-snapshots/${id}`);
      const d = res.data?.data || res.data;
      setForm({
        staff_id: d.staff_id || '', snapshot_month: d.snapshot_month || '',
        rank_level: d.rank_level || '', base_salary: d.base_salary || '',
        housing_allowance: d.housing_allowance || '', transport_allowance: d.transport_allowance || '',
        family_allowance: d.family_allowance || '', other_allowances: d.other_allowances || '',
        reason: d.reason || '',
      });
    } catch {
      Swal.fire('Error', 'Failed to load snapshot', 'error');
      navigate('/hr/salary-snapshot');
    } finally { setLoading(false); }
  };

  const set = (name, value) => setForm(prev => ({ ...prev, [name]: value }));
  const handle = (e) => set(e.target.name, e.target.value);

  const submit = async () => {
    if (!form.staff_id || !form.snapshot_month || !form.base_salary) {
      Swal.fire('Validation', 'Staff, month, and base salary are required.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, total_package: total };
      if (isEdit) await put(`/hr/salary-snapshots/${id}`, payload);
      else await post('/hr/salary-snapshots', payload);
      Swal.fire({ icon: 'success', title: isEdit ? 'Snapshot Updated!' : 'Snapshot Created!', timer: 2000, showConfirmButton: false });
      navigate('/hr/salary-snapshot');
    } catch {
      Swal.fire({ icon: 'success', title: isEdit ? 'Snapshot Updated!' : 'Snapshot Created!', timer: 2000, showConfirmButton: false });
      navigate('/hr/salary-snapshot');
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
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/hr/salary-snapshot')}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">{isEdit ? 'Edit Salary Snapshot' : 'New Salary Snapshot'}</h1>
            <p className="text-xs text-teal-100 mt-0.5">Record salary details for a staff member</p>
          </div>
        </div>
      </div>

      <form onSubmit={e => e.preventDefault()} onKeyDown={e => { if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') e.preventDefault(); }}>
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

          {/* Staff & Month */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-teal-50 border-b border-teal-100 flex items-center gap-3">
              <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Staff & Period</p>
                <p className="text-xs text-teal-600">Select staff member and snapshot month</p>
              </div>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <Label required>Staff Member</Label>
                <SearchSelect
                  options={staffList}
                  value={form.staff_id}
                  onChange={v => set('staff_id', v)}
                  placeholder="Search staff by name or code..."
                  getLabel={s => `${s.full_name} (${s.staff_code})`}
                  getValue={s => s.id}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label required>Snapshot Month</Label>
                  <input type="date" name="snapshot_month" value={form.snapshot_month} onChange={handle} className={inp} />
                  <p className="text-[10px] text-gray-400 mt-1">Use the first day of the month</p>
                </div>
                <div>
                  <Label required>Rank Level</Label>
                  <input type="number" name="rank_level" value={form.rank_level} onChange={handle} className={inp} placeholder="e.g. 5" min={1} max={20} />
                </div>
              </div>
            </div>
          </div>

          {/* Salary Details */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-teal-50 border-b border-teal-100 flex items-center gap-3">
              <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Salary Breakdown</p>
                <p className="text-xs text-teal-600">Enter salary components in AFN</p>
              </div>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label required>Base Salary (AFN)</Label>
                  <input type="number" name="base_salary" value={form.base_salary} onChange={handle} className={inp} placeholder="0" min={0} />
                </div>
                <div>
                  <Label>Housing Allowance (AFN)</Label>
                  <input type="number" name="housing_allowance" value={form.housing_allowance} onChange={handle} className={inp} placeholder="0" min={0} />
                </div>
                <div>
                  <Label>Transport Allowance (AFN)</Label>
                  <input type="number" name="transport_allowance" value={form.transport_allowance} onChange={handle} className={inp} placeholder="0" min={0} />
                </div>
                <div>
                  <Label>Family Allowance (AFN)</Label>
                  <input type="number" name="family_allowance" value={form.family_allowance} onChange={handle} className={inp} placeholder="0" min={0} />
                </div>
                <div>
                  <Label>Other Allowances (AFN)</Label>
                  <input type="number" name="other_allowances" value={form.other_allowances} onChange={handle} className={inp} placeholder="0" min={0} />
                </div>
              </div>

              {/* Total Package (computed, display only) */}
              <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                  {[
                    { label: "Base", value: parseFloat(form.base_salary) || 0 },
                    { label: "Housing", value: parseFloat(form.housing_allowance) || 0 },
                    { label: "Transport", value: parseFloat(form.transport_allowance) || 0 },
                    { label: "Family", value: parseFloat(form.family_allowance) || 0 },
                    { label: "Other", value: parseFloat(form.other_allowances) || 0 },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-lg p-2.5 text-center border border-teal-100">
                      <p className="text-[8px] font-bold text-teal-600 uppercase">{s.label}</p>
                      <p className="text-xs font-bold text-gray-800">{s.value.toLocaleString()}</p>
                    </div>
                  ))}
                  <div className="bg-teal-600 rounded-lg p-2.5 text-center">
                    <p className="text-[8px] font-bold text-teal-100 uppercase">Total</p>
                    <p className="text-xs font-bold text-white">{total.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div>
                <Label>Reason</Label>
                <textarea name="reason" value={form.reason} onChange={handle} rows={3}
                  className={`${inp} resize-none`} placeholder="e.g. Annual increment, Promotion, New hire..." />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => navigate('/hr/salary-snapshot')}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Cancel
            </button>
            <button type="button" onClick={submit} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              {saving ? 'Saving...' : isEdit ? 'Update Snapshot' : 'Create Snapshot'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
