import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, del, put } from '../../api/axios';
import Swal from 'sweetalert2';

const Icons = {
  Plus: () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  Eye: () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
  Edit: () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  Trash: () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Status: () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
};

const getStatusBadge = (status) => ({ active: 'bg-emerald-100 text-emerald-700', inactive: 'bg-gray-100 text-gray-700' }[status] || 'bg-gray-100 text-gray-700');
const inp = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white transition-colors placeholder-gray-400 outline-none';

export default function Subjects() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: '', search: '', category: '' });
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [statusModal, setStatusModal] = useState({ open: false, item: null, status: '' });

  useEffect(() => { fetchItems(); }, [filters]);

  const fetchItems = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      if (filters.category) params.append('category', filters.category);
      const res = await get(`/class-management/subjects/list?${params.toString()}`);
      const data = res.data;
      setItems(data?.data || []);
      setPagination({ current_page: data?.current_page || 1, last_page: data?.last_page || 1, total: data?.total || 0 });
    } catch { setItems([]); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({ title: 'Delete Subject?', text: 'This cannot be undone.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#0d9488', cancelButtonColor: '#ef4444', confirmButtonText: 'Yes, delete' });
    if (result.isConfirmed) {
      try { await del(`/class-management/subjects/delete/${id}`); } catch {}
      fetchItems();
      Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false });
    }
  };

  const handleStatusUpdate = async () => {
    try {
      await put(`/class-management/subjects/update-status/${statusModal.item.id}`, { status: statusModal.status });
      fetchItems();
      Swal.fire({ icon: 'success', title: 'Status Updated!', timer: 1500, showConfirmButton: false });
    } catch { Swal.fire('Error', 'Failed to update status', 'error'); }
    setStatusModal({ open: false, item: null, status: '' });
  };

  const activeCount = items.filter(i => i.status === 'active').length;
  const inactiveCount = items.filter(i => i.status === 'inactive').length;

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="bg-teal-600 px-5 py-4">
        <div className="mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-white">Subjects Management</h1>
            <p className="text-xs text-teal-100 mt-0.5">{pagination.total} subjects</p>
          </div>
          <button onClick={() => navigate('/class-management/subjects/create')}
            className="px-4 py-2 bg-white text-teal-600 rounded-xl hover:bg-teal-50 transition-colors flex items-center gap-2 font-semibold text-xs shadow-sm">
            <Icons.Plus /> Add New Subject
          </button>
        </div>
      </div>

      <div className="mx-auto px-4 py-4">
        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
              <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className={inp}>
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Category</label>
              <select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })} className={inp}>
                <option value="">All Categories</option>
                <option value="Maarif Subjects">Maarif Subjects</option>
                <option value="Taqwayati Mayari">Taqwayati Mayari</option>
                <option value="Taqwayati Takhasosi">Taqwayati Takhasosi</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Search</label>
              <div className="relative">
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Search by name or code..." className={`${inp} pl-10`} />
              </div>
            </div>
          </div>
          {(filters.status || filters.search || filters.category) && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
              <button onClick={() => setFilters({ status: '', search: '', category: '' })} className="px-3 py-1.5 text-xs font-medium text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">Clear Filters</button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Total Subjects', value: pagination.total, color: 'bg-blue-50 text-blue-700' },
            { label: 'Active', value: activeCount, color: 'bg-emerald-50 text-emerald-700' },
            { label: 'Inactive', value: inactiveCount, color: 'bg-gray-100 text-gray-700' },
          ].map((s, i) => (
            <div key={i} className={`${s.color} rounded-xl p-4 border border-current/10`}>
              <p className="text-xs font-medium opacity-70">{s.label}</p>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-teal-50 border-b border-teal-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Code</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Subject Name</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider hidden md:table-cell">Category</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider hidden lg:table-cell">Weekly Hours</th>
                    <th className="px-4 py-3 text-center text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.length === 0 ? (
                    <tr><td colSpan="6" className="px-4 py-12 text-center"><p className="text-sm text-gray-400">No subjects found</p>
                      <button onClick={() => navigate('/class-management/subjects/create')} className="mt-3 text-xs font-semibold text-teal-600">Create your first subject</button></td></tr>
                  ) : items.map(item => (
                    <tr key={item.id} onClick={() => navigate(`/class-management/subjects/show/${item.id}`)} className="hover:bg-gray-50 cursor-pointer transition-colors group">
                      <td className="px-4 py-3"><p className="text-xs font-semibold text-teal-600">{item.subject_code}</p></td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-gray-700">{item.subject_name}</p>
                        {item.book_name && <p className="text-[10px] text-gray-400 truncate">{item.book_name}</p>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell"><span className="text-[11px] text-gray-600">{item.category}</span></td>
                      <td className="px-4 py-3 hidden lg:table-cell"><span className="text-[11px] text-gray-600">{item.weekly_hours ? `${item.weekly_hours}h/week` : '—'}</span></td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize ${getStatusBadge(item.status)}`}>{item.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => navigate(`/class-management/subjects/show/${item.id}`)} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="View"><Icons.Eye /></button>
                          <button onClick={() => navigate(`/class-management/subjects/edit/${item.id}`)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Edit"><Icons.Edit /></button>
                          <button onClick={() => setStatusModal({ open: true, item, status: item.status === 'active' ? 'inactive' : 'active' })} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Toggle Status"><Icons.Status /></button>
                          <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Icons.Trash /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.last_page > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-500">Page {pagination.current_page} of {pagination.last_page}</p>
                <div className="flex gap-1">
                  <button onClick={() => fetchItems(pagination.current_page - 1)} disabled={pagination.current_page <= 1} className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">Previous</button>
                  <button onClick={() => fetchItems(pagination.current_page + 1)} disabled={pagination.current_page >= pagination.last_page} className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Modal */}
      {statusModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setStatusModal({ open: false, item: null, status: '' })}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">Update Status</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">{statusModal.item?.subject_name}</p>
            </div>
            <div className="p-5">
              <p className="text-xs text-gray-600 mb-3">Change status to <span className="font-bold capitalize">{statusModal.status}</span>?</p>
            </div>
            <div className="px-5 py-4 bg-gray-50 flex justify-end gap-2 rounded-b-2xl">
              <button onClick={() => setStatusModal({ open: false, item: null, status: '' })} className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-medium">Cancel</button>
              <button onClick={handleStatusUpdate} className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
