import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, del } from '../../../api/axios';
import Swal from 'sweetalert2';

export default function Teachers() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });

  const fetchItems = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      if (search) params.append('search', search);
      if (filterStatus) params.append('status', filterStatus);
      const res = await get(`/teacher-management/teachers/list?${params.toString()}`);
      setItems(res.data?.data || []);
      if (res.data?.meta) setMeta(res.data.meta);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus]);

  useEffect(() => {
    const timer = setTimeout(() => fetchItems(1), 400);
    return () => clearTimeout(timer);
  }, [search, filterStatus]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    const res = await Swal.fire({
      title: 'Remove this teacher?',
      text: 'The staff record will not be deleted, only the teacher registration.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Remove',
    });
    if (res.isConfirmed) {
      try { await del(`/teacher-management/teachers/delete/${id}`); } catch {}
      fetchItems(meta.current_page);
      Swal.fire({ icon: 'success', title: 'Removed', timer: 1500, showConfirmButton: false });
    }
  };

  const totalHours = items.reduce((sum, t) => sum + (t.weekly_hours || 0), 0);
  const activeCount = items.filter(t => t.status === 'active').length;

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Teachers</h1>
          <p className="text-xs text-gray-400 mt-0.5">Academic staff registered as teachers with weekly hour capacity</p>
        </div>
        <button onClick={() => navigate('/teacher-management/teachers/create')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add New Teacher
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Teachers', value: meta.total, icon: 'M12 14l9-5-9-5-9 5 9 5z', bg: 'bg-teal-600', iconBg: 'bg-white/20', text: 'text-white' },
          { label: 'Active', value: activeCount, icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', bg: 'bg-white border-teal-100 border', iconBg: 'bg-emerald-50', text: 'text-gray-800' },
          { label: 'Total Hours/Week', value: totalHours, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', bg: 'bg-white border-teal-100 border', iconBg: 'bg-amber-50', text: 'text-gray-800' },
        ].map((s, i) => (
          <div key={s.label} className={`flex items-center gap-3 p-4 rounded-2xl ${s.bg}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.iconBg}`}>
              <svg className={`w-4 h-4 ${i === 0 ? 'text-white' : 'text-teal-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} />
              </svg>
            </div>
            <div>
              <p className={`text-[10px] font-medium ${i === 0 ? 'text-teal-100' : 'text-gray-500'}`}>{s.label}</p>
              <p className={`text-xl font-bold leading-tight ${s.text}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search/filter */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by teacher name or email..."
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 bg-white">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Teacher</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Capacity</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Workload</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {item.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                          {item.email && <p className="text-[10px] text-gray-400">{item.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600">{item.role || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold">
                        {item.weekly_hours} h/week
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const used = item.used_hours || 0;
                        const total = item.weekly_hours || 0;
                        const pct = total > 0 ? Math.round((used / total) * 100) : 0;
                        const barColor = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-teal-500';
                        return (
                          <div className="min-w-[120px]">
                            <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                              <span>{used}h / {total}h</span>
                              <span className={item.is_full ? 'text-red-600 font-semibold' : 'text-gray-500'}>{pct}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full ${barColor} rounded-full`} style={{ width: `${Math.min(100, pct)}%` }} />
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${item.status === 'active' ? 'bg-teal-50 text-teal-700' : 'bg-gray-100 text-gray-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'active' ? 'bg-teal-500' : 'bg-gray-400'}`} />
                        {item.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/teacher-management/teachers/edit/${item.id}`)}
                          className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg" title="Edit">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={(e) => handleDelete(e, item.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Remove">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {items.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-600">No teachers registered yet</p>
              <p className="text-xs text-gray-400 mt-1">Add academic staff as teachers to assign them to classes</p>
              <button onClick={() => navigate('/teacher-management/teachers/create')}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add First Teacher
              </button>
            </div>
          )}

          {meta.last_page > 1 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Showing {(meta.current_page - 1) * meta.per_page + 1}-{Math.min(meta.current_page * meta.per_page, meta.total)} of {meta.total}
              </p>
              <div className="flex gap-1">
                <button onClick={() => fetchItems(meta.current_page - 1)} disabled={meta.current_page <= 1}
                  className="px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">
                  Previous
                </button>
                <button onClick={() => fetchItems(meta.current_page + 1)} disabled={meta.current_page >= meta.last_page}
                  className="px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
