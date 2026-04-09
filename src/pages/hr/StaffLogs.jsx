import { useState, useEffect } from 'react';
import { get } from '../../api/axios';

const actionStyle = {
  transfer: 'bg-blue-100 text-blue-700',
  update: 'bg-teal-100 text-teal-700',
};

const fieldLabels = {
  branch_id: 'Branch',
  department: 'Department',
  role_title_en: 'Position Title',
  contract_type: 'Contract Type',
};

export default function StaffLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [viewLog, setViewLog] = useState(null);

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await get('/hr/staff/logs?per_page=100');
      setLogs(res.data?.data || []);
    } catch {
      setLogs([]);
    } finally { setLoading(false); }
  };

  const filtered = logs.filter(log => {
    if (actionFilter && log.action !== actionFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const name = log.staff?.application?.full_name || log.staff?.employee_id || '';
    return name.toLowerCase().includes(q) || log.field_changed?.toLowerCase().includes(q) ||
      log.old_value?.toLowerCase().includes(q) || log.new_value?.toLowerCase().includes(q);
  });

  return (
    <div className="px-4 py-5 space-y-5">
      <div>
        <h1 className="text-lg font-bold text-gray-800">Staff Logs</h1>
        <p className="text-xs text-gray-400 mt-0.5">Track all staff transfers, department changes, and position updates</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] sm:flex-none sm:w-80">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by staff name, field, value..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white" />
        </div>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white">
          <option value="">All Actions</option>
          <option value="transfer">Transfer</option>
          <option value="update">Update</option>
        </select>
        {(search || actionFilter) && (
          <button onClick={() => { setSearch(''); setActionFilter(''); }}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50">Clear</button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Staff</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Field</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Old Value</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">New Value</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Notes</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Changed By</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-800">{log.staff?.application?.full_name || `Staff #${log.staff?.employee_id || log.staff_id}`}</p>
                      <p className="text-[10px] text-gray-400">{log.staff?.employee_id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${actionStyle[log.action] || 'bg-gray-100 text-gray-600'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">{fieldLabels[log.field_changed] || log.field_changed}</td>
                    <td className="px-4 py-3">
                      {log.old_value ? (
                        <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">{log.old_value}</span>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-teal-700 bg-teal-50 px-2 py-0.5 rounded">{log.new_value}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{log.notes || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-700">{log.changed_by_user?.name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{log.created_at ? new Date(log.created_at).toLocaleString() : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setViewLog(log)}
                        className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="View Details">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <p className="text-sm font-medium text-gray-600">No staff logs yet</p>
              <p className="text-xs text-gray-400 mt-1">Logs will appear when staff are transferred or updated</p>
            </div>
          )}
        </div>
      )}
      {/* View Log Detail Modal */}
      {viewLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className={`px-5 py-4 border-b ${viewLog.action === 'transfer' ? 'bg-blue-50 border-blue-200' : 'bg-teal-50 border-teal-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${viewLog.action === 'transfer' ? 'bg-blue-600' : 'bg-teal-600'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {viewLog.action === 'transfer'
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    }
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800 capitalize">{viewLog.action} Log Detail</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">{viewLog.created_at ? new Date(viewLog.created_at).toLocaleString() : ''}</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Staff Info */}
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Staff Member</p>
                <p className="text-sm font-bold text-gray-800">{viewLog.staff?.application?.full_name || `Staff #${viewLog.staff?.employee_id || viewLog.staff_id}`}</p>
                <p className="text-xs text-gray-500 mt-0.5">{viewLog.staff?.employee_id} {viewLog.staff?.branch?.name ? `· ${viewLog.staff.branch.name}` : ''}</p>
              </div>

              {/* Change Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Action</p>
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${actionStyle[viewLog.action] || 'bg-gray-100 text-gray-600'}`}>{viewLog.action}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Field Changed</p>
                  <p className="text-sm font-medium text-gray-800">{fieldLabels[viewLog.field_changed] || viewLog.field_changed}</p>
                </div>
              </div>

              {/* Old → New */}
              <div className="flex items-center gap-3">
                <div className="flex-1 p-3 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-1">Old Value</p>
                  <p className="text-sm font-medium text-red-700">{viewLog.old_value || '—'}</p>
                </div>
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                <div className="flex-1 p-3 bg-teal-50 rounded-xl border border-teal-100">
                  <p className="text-[10px] font-semibold text-teal-400 uppercase tracking-wider mb-1">New Value</p>
                  <p className="text-sm font-medium text-teal-700">{viewLog.new_value}</p>
                </div>
              </div>

              {/* Notes */}
              {viewLog.notes && (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-xs text-gray-700 whitespace-pre-wrap">{viewLog.notes}</p>
                </div>
              )}

              {/* Changed By */}
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Changed By</p>
                <p className="text-sm font-medium text-gray-800">{viewLog.changed_by_user?.name || '—'}</p>
              </div>
            </div>

            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200">
              <button onClick={() => setViewLog(null)}
                className="w-full py-2 bg-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-300 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
