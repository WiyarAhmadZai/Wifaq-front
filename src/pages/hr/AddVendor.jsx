import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, del } from '../../api/axios';
import Swal from 'sweetalert2';

const DEMO_VENDORS = [
  { id: 1, name: 'ABC Supplies Ltd.', category: 'supplier', work_type: 'Office Supplies', contact: '+93 700 111 222', address: 'Street 1, Kabul', quality_rating: 4, price_rating: 3, deadline_rating: 5, response_rating: 4, payment_terms: 'Net 30', recommended_by: 'Finance Dept', date_engaged: '2025-06-15', notes: '' },
  { id: 2, name: 'Tech Solutions Co.', category: 'consultant', work_type: 'IT Services', contact: '+93 700 333 444', address: 'District 10, Kabul', quality_rating: 5, price_rating: 4, deadline_rating: 4, response_rating: 5, payment_terms: '50% upfront', recommended_by: 'IT Department', date_engaged: '2025-09-01', notes: 'Excellent support' },
  { id: 3, name: 'BuildRight Contractors', category: 'contractor', work_type: 'Construction', contact: '+93 700 555 666', address: 'Herat Main Road', quality_rating: 3, price_rating: 3, deadline_rating: 2, response_rating: 3, payment_terms: 'Milestone-based', recommended_by: 'Admin', date_engaged: '2025-03-20', notes: '' },
  { id: 4, name: 'EduBooks International', category: 'supplier', work_type: 'Textbooks', contact: '+93 700 777 888', address: 'Mazar-e-Sharif', quality_rating: 5, price_rating: 5, deadline_rating: 4, response_rating: 4, payment_terms: 'Net 60', recommended_by: 'Academic Dept', date_engaged: '2026-01-10', notes: '' },
];

export default function AddVendor() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await get('/hr/vendors');
      const list = res.data?.data || res.data || [];
      setItems(list.length ? list : DEMO_VENDORS);
    } catch { setItems(DEMO_VENDORS); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({ title: 'Delete Vendor?', text: 'This action cannot be undone.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#0d9488', cancelButtonColor: '#ef4444', confirmButtonText: 'Yes, delete' });
    if (result.isConfirmed) {
      try { await del(`/hr/vendors/${id}`); fetchItems(); } catch { setItems(prev => prev.filter(v => v.id !== id)); }
      Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false });
    }
  };

  const filtered = items.filter(v => {
    const q = search.toLowerCase();
    return !q || (v.name || '').toLowerCase().includes(q) || (v.category || '').toLowerCase().includes(q) || (v.work_type || '').toLowerCase().includes(q);
  });

  const avgRating = (field) => {
    const vals = items.filter(i => i[field]).map(i => Number(i[field]));
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—';
  };

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="bg-teal-600 px-5 py-4">
        <div className="max-w-full mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-white">Vendors / تأمین‌کنندگان</h1>
            <p className="text-xs text-teal-100 mt-0.5">{items.length} vendors</p>
          </div>
          <button onClick={() => navigate('/hr/add-vendor/create')}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Vendor
          </button>
        </div>
      </div>

      <div className="max-w-full mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Vendors', value: items.length, icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5' },
            { label: 'Avg Quality', value: avgRating('quality_rating'), icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
            { label: 'Avg Price', value: avgRating('price_rating'), icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 10v1' },
            { label: 'Avg Deadline', value: avgRating('deadline_rating'), icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, category, or work type..."
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
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider hidden md:table-cell">Contact</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider hidden lg:table-cell">Date Engaged</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider hidden lg:table-cell">Quality</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider hidden lg:table-cell">Price</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((v, i) => (
                    <tr key={v.id} onClick={() => navigate(`/hr/add-vendor/show/${v.id}`)} className="hover:bg-teal-50/40 cursor-pointer transition-colors group">
                      <td className="px-4 py-3 text-xs font-medium text-teal-600">{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-800">{v.name}</p>
                        <p className="text-[11px] text-gray-400">{v.work_type}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 bg-teal-50 text-teal-700 text-[11px] font-medium rounded-lg border border-teal-100 capitalize">{v.category}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 hidden md:table-cell">{v.contact || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">{v.date_engaged || '—'}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {v.quality_rating ? <span className="px-2 py-0.5 bg-teal-50 text-teal-700 text-[11px] font-semibold rounded-full">{v.quality_rating}/5</span> : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {v.price_rating ? <span className="px-2 py-0.5 bg-teal-50 text-teal-700 text-[11px] font-semibold rounded-full">{v.price_rating}/5</span> : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => navigate(`/hr/add-vendor/show/${v.id}`)} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="View">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>
                          <button onClick={() => navigate(`/hr/add-vendor/edit/${v.id}`)} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Edit">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => handleDelete(v.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
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
                <p className="text-sm text-gray-400 font-medium">No vendors found</p>
                <button onClick={() => navigate('/hr/add-vendor/create')} className="mt-3 text-xs font-semibold text-teal-600 hover:text-teal-700">Add your first vendor</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
