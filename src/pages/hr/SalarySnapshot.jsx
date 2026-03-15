import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, del } from '../../api/axios';
import Swal from 'sweetalert2';

const DEMO_ITEMS = [
  { id: 1, staff_id: 1, staff_name: "Ahmad Rahimi", staff_code: "WS-2026-001", snapshot_month: "2026-03-01", rank_level: 5, base_salary: 25000, housing_allowance: 3000, transport_allowance: 2000, family_allowance: 2000, other_allowances: 0, total_package: 32000, reason: "Annual increment" },
  { id: 2, staff_id: 2, staff_name: "Mohammad Karimi", staff_code: "WS-2026-002", snapshot_month: "2026-03-01", rank_level: 4, base_salary: 20000, housing_allowance: 2500, transport_allowance: 1500, family_allowance: 2000, other_allowances: 500, total_package: 26500, reason: "Promotion to Level 4" },
  { id: 3, staff_id: 3, staff_name: "Fatima Noori", staff_code: "WS-2026-003", snapshot_month: "2026-02-01", rank_level: 3, base_salary: 18000, housing_allowance: 2000, transport_allowance: 1500, family_allowance: 0, other_allowances: 0, total_package: 21500, reason: "New hire" },
  { id: 4, staff_id: 1, staff_name: "Ahmad Rahimi", staff_code: "WS-2026-001", snapshot_month: "2026-02-01", rank_level: 5, base_salary: 23000, housing_allowance: 3000, transport_allowance: 2000, family_allowance: 2000, other_allowances: 0, total_package: 30000, reason: "Previous month" },
  { id: 5, staff_id: 4, staff_name: "Ali Ahmadi", staff_code: "WS-2026-004", snapshot_month: "2026-03-01", rank_level: 6, base_salary: 22000, housing_allowance: 2500, transport_allowance: 2000, family_allowance: 1500, other_allowances: 1000, total_package: 29000, reason: "Quarterly review" },
];

export default function SalarySnapshot() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await get('/hr/salary-snapshots');
      const list = res.data?.data || res.data || [];
      setItems(list.length ? list : DEMO_ITEMS);
    } catch {
      setItems(DEMO_ITEMS);
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({ title: 'Delete Snapshot?', text: 'This action cannot be undone.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#0d9488', cancelButtonColor: '#ef4444', confirmButtonText: 'Yes, delete' });
    if (result.isConfirmed) {
      try { await del(`/hr/salary-snapshots/${id}`); fetchItems(); } catch { setItems(prev => prev.filter(i => i.id !== id)); }
      Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false });
    }
  };

  const filtered = items.filter(item => {
    const q = search.toLowerCase();
    return !q || (item.staff_name || '').toLowerCase().includes(q) || (item.staff_code || '').toLowerCase().includes(q) || (item.reason || '').toLowerCase().includes(q);
  });

  const totalPayroll = items.reduce((sum, i) => sum + (i.total_package || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="bg-teal-600 px-5 py-4">
        <div className="max-w-full mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-white">Salary Snapshots</h1>
            <p className="text-xs text-teal-100 mt-0.5">{items.length} records</p>
          </div>
          <button onClick={() => navigate('/hr/salary-snapshot/create')}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Snapshot
          </button>
        </div>
      </div>

      <div className="max-w-full mx-auto px-4 py-6 space-y-4">
        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Snapshots', value: items.length, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
            { label: 'Unique Staff', value: new Set(items.map(i => i.staff_id)).size, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
            { label: 'Total Payroll', value: `AFN ${totalPayroll.toLocaleString()}`, icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} /></svg>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{s.label}</p>
                  <p className="text-lg font-black text-gray-800">{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="relative">
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by staff name, code, or reason..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none placeholder-gray-400" />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-teal-50 border-b border-teal-100">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Staff</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Month</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider hidden md:table-cell">Rank</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider hidden lg:table-cell">Base Salary</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Total Package</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider hidden lg:table-cell">Reason</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((item, i) => (
                    <tr key={item.id} onClick={() => navigate(`/hr/salary-snapshot/show/${item.id}`)}
                      className="hover:bg-teal-50/40 cursor-pointer transition-colors group">
                      <td className="px-4 py-3 text-xs font-medium text-teal-600">{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-800">{item.staff_name}</p>
                        <p className="text-[11px] text-gray-400">{item.staff_code}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{item.snapshot_month}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">Level {item.rank_level}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">AFN {(item.base_salary || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold text-teal-700">AFN {(item.total_package || 0).toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-gray-500 hidden lg:table-cell max-w-[150px] truncate">{item.reason || '—'}</td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => navigate(`/hr/salary-snapshot/show/${item.id}`)}
                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="View">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>
                          <button onClick={() => navigate(`/hr/salary-snapshot/edit/${item.id}`)}
                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Edit">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <svg className="w-12 h-12 mx-auto text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <p className="text-sm text-gray-400 font-medium">No snapshots found</p>
                <button onClick={() => navigate('/hr/salary-snapshot/create')} className="mt-3 text-xs font-semibold text-teal-600 hover:text-teal-700">Create your first snapshot</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
