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
    </div>
  );
}
