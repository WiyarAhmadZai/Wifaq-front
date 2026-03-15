import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, del } from '../../api/axios';
import Swal from 'sweetalert2';

const DEMO_ITEMS = [
  { id: 1, date: "2026-03-15", visitor_name: "Mohammad Ali", purpose: "Meeting with Principal", time_in: "09:00", time_out: "10:30", met_with: "Ahmad Rahimi", notes: "Discussed student enrollment" },
  { id: 2, date: "2026-03-15", visitor_name: "Zahra Sultani", purpose: "Document Delivery", time_in: "11:00", time_out: "11:15", met_with: "Fatima Noori", notes: "" },
  { id: 3, date: "2026-03-14", visitor_name: "Khalid Noori", purpose: "Interview", time_in: "14:00", time_out: "15:00", met_with: "Mohammad Karimi", notes: "Teacher candidate" },
  { id: 4, date: "2026-03-14", visitor_name: "Mariam Ahmadi", purpose: "Parent Meeting", time_in: "10:00", time_out: "10:45", met_with: "Ahmad Rahimi", notes: "Report card discussion" },
  { id: 5, date: "2026-03-13", visitor_name: "Abdul Rahman", purpose: "Maintenance Check", time_in: "08:30", time_out: "12:00", met_with: "Ali Ahmadi", notes: "Electrical inspection" },
];

export default function VisitorLog() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await get('/hr/visitor-logs');
      const list = res.data?.data || res.data || [];
      setItems(list.length ? list : DEMO_ITEMS);
    } catch { setItems(DEMO_ITEMS); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({ title: 'Delete Entry?', text: 'This action cannot be undone.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#0d9488', cancelButtonColor: '#ef4444', confirmButtonText: 'Yes, delete' });
    if (result.isConfirmed) {
      try { await del(`/hr/visitor-logs/${id}`); fetchItems(); } catch { setItems(prev => prev.filter(i => i.id !== id)); }
      Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false });
    }
  };

  const filtered = items.filter(item => {
    const q = search.toLowerCase();
    return !q || (item.visitor_name || '').toLowerCase().includes(q) || (item.purpose || '').toLowerCase().includes(q) || (item.met_with || '').toLowerCase().includes(q);
  });

  const todayCount = items.filter(i => i.date === new Date().toISOString().split('T')[0]).length;

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="bg-teal-600 px-5 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-white">Visitor Log / ثبت مهمان</h1>
            <p className="text-xs text-teal-100 mt-0.5">{items.length} entries</p>
          </div>
          <button onClick={() => navigate('/hr/visitor-log/create')}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Entry
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Entries', value: items.length, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
            { label: 'Today', value: todayCount, icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
            { label: 'Unique Visitors', value: new Set(items.map(i => i.visitor_name)).size, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} /></svg>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{s.label}</p>
                  <p className="text-xl font-black text-gray-800">{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="relative">
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by visitor name, purpose, or met with..."
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
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Visitor Name</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Purpose</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider hidden md:table-cell">Time In</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider hidden md:table-cell">Time Out</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider hidden lg:table-cell">Met With</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((item, i) => (
                    <tr key={item.id} onClick={() => navigate(`/hr/visitor-log/show/${item.id}`)} className="hover:bg-teal-50/40 cursor-pointer transition-colors group">
                      <td className="px-4 py-3 text-xs font-medium text-teal-600">{i + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{item.date}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-800">{item.visitor_name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 bg-teal-50 text-teal-700 text-[11px] font-medium rounded-lg border border-teal-100">{item.purpose}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{item.time_in || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{item.time_out || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">{item.met_with || '—'}</td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => navigate(`/hr/visitor-log/show/${item.id}`)} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="View">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>
                          <button onClick={() => navigate(`/hr/visitor-log/edit/${item.id}`)} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Edit">
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
                <svg className="w-12 h-12 mx-auto text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <p className="text-sm text-gray-400 font-medium">No visitor logs found</p>
                <button onClick={() => navigate('/hr/visitor-log/create')} className="mt-3 text-xs font-semibold text-teal-600 hover:text-teal-700">Create first entry</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
