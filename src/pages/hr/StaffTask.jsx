import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, del, put } from '../../api/axios';
import Swal from 'sweetalert2';

const statusStyle = { pending: "bg-yellow-50 text-yellow-700", in_progress: "bg-teal-50 text-teal-700", completed: "bg-teal-50 text-teal-700" };
const statusDot = { pending: "bg-yellow-500", in_progress: "bg-teal-500", completed: "bg-teal-600" };
const statusLabel = { pending: "Pending", in_progress: "In Progress", completed: "Completed" };
const qualityStyle = { excellent: "bg-teal-50 text-teal-700", good: "bg-teal-50 text-teal-600", average: "bg-yellow-50 text-yellow-700", poor: "bg-red-50 text-red-700" };
const taskTypeStyle = { urgent: "bg-red-100 text-red-700", high: "bg-orange-100 text-orange-700", normal: "bg-blue-100 text-blue-700", low: "bg-gray-100 text-gray-600" };

export default function StaffTask() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await get('/hr/staff-tasks');
      const data = response.data?.data || response.data || [];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const activeFilters = [filterStatus].filter(Boolean).length;

  const filtered = items.filter(it => {
    const q = search.toLowerCase();
    const name = it.staff?.application?.full_name || it.staff_name || '';
    if (q && !name.toLowerCase().includes(q) && !it.task?.toLowerCase().includes(q)) return false;
    if (filterStatus && it.status !== filterStatus) return false;
    return true;
  });

  const stats = [
    { label: "Total Tasks", value: items.length, icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
    { label: "Pending", value: items.filter(r => r.status === "pending").length, icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "In Progress", value: items.filter(r => r.status === "in_progress").length, icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" },
    { label: "Completed", value: items.filter(r => r.status === "completed").length, icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  ];

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    const result = await Swal.fire({ title: "Delete this task?", text: "This action cannot be undone.", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", cancelButtonColor: "#6b7280", confirmButtonText: "Delete" });
    if (result.isConfirmed) {
      try { await del(`/hr/staff-tasks/${id}`); } catch {}
      fetchItems();
      Swal.fire({ icon: "success", title: "Deleted", timer: 1500, showConfirmButton: false });
    }
  };

  const handleStatusUpdate = async (e, item) => {
    e.stopPropagation();
    const { value: newStatus } = await Swal.fire({
      title: 'Update Status',
      input: 'select',
      inputOptions: { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed' },
      inputValue: item.status,
      showCancelButton: true,
      confirmButtonColor: '#0d9488',
    });
    if (newStatus && newStatus !== item.status) {
      try {
        await put(`/hr/staff-tasks/${item.id}`, { status: newStatus });
        fetchItems();
      } catch {}
      Swal.fire({ icon: "success", title: `Status: ${statusLabel[newStatus]}`, timer: 1500, showConfirmButton: false });
    }
  };

  const handleQualityUpdate = async (e, item) => {
    e.stopPropagation();
    if (item.status !== 'completed') {
      Swal.fire('Info', 'Quality can only be set for completed tasks.', 'info');
      return;
    }
    const { value: quality } = await Swal.fire({
      title: 'Rate Task Quality',
      input: 'select',
      inputOptions: { excellent: 'Excellent', good: 'Good', average: 'Average', poor: 'Poor' },
      showCancelButton: true,
      confirmButtonColor: '#0d9488',
    });
    if (quality) {
      try {
        await put(`/hr/staff-tasks/${item.id}`, { quality });
        fetchItems();
      } catch {}
      Swal.fire({ icon: "success", title: `Quality: ${quality}`, timer: 1500, showConfirmButton: false });
    }
  };

  const getStaffName = (item) => item.staff?.application?.full_name || item.staff_name || '—';

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Staff Tasks</h1>
          <p className="text-xs text-gray-400 mt-0.5">Assign and track staff tasks</p>
        </div>
        <button onClick={() => navigate("/hr/staff-task/create")}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Task
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div key={s.label} className={`flex items-center gap-3 p-4 rounded-2xl border ${i === 0 ? "bg-teal-600 border-teal-600" : "bg-white border-teal-100"}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${i === 0 ? "bg-white/20" : "bg-teal-50"}`}>
              <svg className={`w-4 h-4 ${i === 0 ? "text-white" : "text-teal-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} /></svg>
            </div>
            <div>
              <p className={`text-[10px] font-medium ${i === 0 ? "text-teal-100" : "text-gray-500"}`}>{s.label}</p>
              <p className={`text-xl font-bold leading-tight ${i === 0 ? "text-white" : "text-gray-800"}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by staff name or task..."
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white" />
          </div>
          <button onClick={() => setFilterOpen(!filterOpen)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${filterOpen || activeFilters ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-600 border-gray-200 hover:border-teal-300"}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            Filters
          </button>
          {(activeFilters > 0 || search) && (
            <button onClick={() => { setSearch(""); setFilterStatus(""); }}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">Clear</button>
          )}
        </div>
        {filterOpen && (
          <div className="pt-1 border-t border-gray-100">
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 bg-white">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Staff</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Task</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Dates</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Quality</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-white">{getStaffName(item).charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{getStaffName(item)}</p>
                          <p className="text-[11px] text-gray-400">by {item.assigner?.name || "Admin"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700 max-w-xs truncate">{item.task}</p>
                      {item.notes && <p className="text-[11px] text-gray-400 truncate max-w-xs">{item.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${taskTypeStyle[item.task_type] || "bg-gray-100 text-gray-600"}`}>
                        {item.task_type || "normal"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-700">{item.start_date ? new Date(item.start_date).toLocaleDateString() : "—"}</p>
                      {item.deadline && (
                        <p className="text-[10px] text-red-500 font-medium">Due: {new Date(item.deadline).toLocaleDateString()}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusStyle[item.status] || "bg-gray-100 text-gray-600"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusDot[item.status] || "bg-gray-400"}`} />
                        {statusLabel[item.status] || item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.quality ? (
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${qualityStyle[item.quality]}`}>
                          {item.quality}
                        </span>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={(e) => handleStatusUpdate(e, item)}
                          className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Update Status">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                        {item.status === 'completed' && (
                          <button onClick={(e) => handleQualityUpdate(e, item)}
                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Rate Quality">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                          </button>
                        )}
                        <button onClick={() => navigate(`/hr/staff-task/show/${item.id}`)}
                          className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="View">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button onClick={() => navigate(`/hr/staff-task/edit/${item.id}`)}
                          className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Edit">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={(e) => handleDelete(e, item.id)}
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
            <div className="text-center py-16 px-4">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-sm font-medium text-gray-600">No tasks found</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
              <button onClick={() => navigate("/hr/staff-task/create")}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Create First Task
              </button>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-400">Showing {filtered.length} of {items.length} tasks</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
