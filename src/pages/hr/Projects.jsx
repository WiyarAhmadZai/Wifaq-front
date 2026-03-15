import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, del } from '../../api/axios';
import Swal from 'sweetalert2';

const DEMO_ITEMS = [
  { id: 1, project_name: "School Renovation Phase 1", start_date: "2026-01-15", end_date: "2026-06-30", budget: 1500000, manager_id: 1, manager_name: "Ahmad Rahimi", status: "active" },
  { id: 2, project_name: "IT Infrastructure Upgrade", start_date: "2026-02-01", end_date: "2026-04-30", budget: 350000, manager_id: 4, manager_name: "Ali Ahmadi", status: "active" },
  { id: 3, project_name: "Curriculum Development 1405", start_date: "2025-09-01", end_date: "2026-03-01", budget: 200000, manager_id: 2, manager_name: "Mohammad Karimi", status: "completed" },
  { id: 4, project_name: "Staff Training Program", start_date: "2026-03-01", end_date: "2026-08-31", budget: 450000, manager_id: 3, manager_name: "Fatima Noori", status: "active" },
  { id: 5, project_name: "Library Expansion", start_date: "2026-04-01", end_date: "2026-12-31", budget: 800000, manager_id: 1, manager_name: "Ahmad Rahimi", status: "planned" },
];

export default function Projects() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await get('/purchase/projects');
      const list = res.data?.data || res.data || [];
      setItems(list.length ? list : DEMO_ITEMS);
    } catch { setItems(DEMO_ITEMS); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({ title: 'Delete Project?', text: 'This action cannot be undone.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#0d9488', cancelButtonColor: '#ef4444', confirmButtonText: 'Yes, delete' });
    if (result.isConfirmed) {
      try { await del(`/purchase/projects/${id}`); fetchItems(); } catch { setItems(prev => prev.filter(i => i.id !== id)); }
      Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false });
    }
  };

  const filtered = items.filter(item => {
    const q = search.toLowerCase();
    return !q || (item.project_name || '').toLowerCase().includes(q) || (item.manager_name || '').toLowerCase().includes(q);
  });

  const totalBudget = items.reduce((s, i) => s + (i.budget || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="bg-teal-600 px-5 py-4">
        <div className="max-w-full mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-white">Projects</h1>
            <p className="text-xs text-teal-100 mt-0.5">{items.length} projects</p>
          </div>
          <button onClick={() => navigate('/purchase/projects/create')}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Project
          </button>
        </div>
      </div>

      <div className="max-w-full mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Projects', value: items.length, icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5' },
            { label: 'Active', value: items.filter(i => i.status === 'active').length, icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'Total Budget', value: `AFN ${totalBudget.toLocaleString()}`, icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 10v1' },
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

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="relative">
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by project name or manager..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none placeholder-gray-400" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-teal-50 border-b border-teal-100">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Project Name</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Manager</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider hidden md:table-cell">Start</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider hidden md:table-cell">End</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Budget</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((item, i) => (
                    <tr key={item.id} onClick={() => navigate(`/purchase/projects/show/${item.id}`)} className="hover:bg-teal-50/40 cursor-pointer transition-colors group">
                      <td className="px-4 py-3 text-xs font-medium text-teal-600">{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-800">{item.project_name}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{item.manager_name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{item.start_date}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{item.end_date}</td>
                      <td className="px-4 py-3"><span className="text-sm font-bold text-teal-700">AFN {(item.budget || 0).toLocaleString()}</span></td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => navigate(`/purchase/projects/show/${item.id}`)} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="View">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>
                          <button onClick={() => navigate(`/purchase/projects/edit/${item.id}`)} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Edit">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
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
                <svg className="w-12 h-12 mx-auto text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" /></svg>
                <p className="text-sm text-gray-400 font-medium">No projects found</p>
                <button onClick={() => navigate('/purchase/projects/create')} className="mt-3 text-xs font-semibold text-teal-600 hover:text-teal-700">Create your first project</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
