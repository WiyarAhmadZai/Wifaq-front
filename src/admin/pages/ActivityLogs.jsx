import { useEffect, useState } from 'react';
import { activityLogsApi } from '../../api/activityLogs';
import { useActivityLogs } from '../../hooks/useActivityLogs';
import ActivityLogDrawer from '../components/ActivityLogDrawer';

/** Short, human local time for the table cell. */
function shortTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const EVENT_STYLES = {
  created: 'bg-green-50 text-green-700',
  updated: 'bg-amber-50 text-amber-700',
  deleted: 'bg-red-50 text-red-700',
  login: 'bg-teal-50 text-teal-700',
  logout: 'bg-gray-100 text-gray-600',
  login_failed: 'bg-red-50 text-red-700',
};

export default function ActivityLogs() {
  const {
    items, meta, loading, error,
    filters, updateFilter, resetFilters, goToPage,
  } = useActivityLogs();

  const [facets, setFacets] = useState({ log_names: [], events: [], subject_types: [] });
  const [selected, setSelected] = useState(null); // { id, fallback }

  useEffect(() => {
    activityLogsApi.filters()
      .then((res) => setFacets(res.data?.data || { log_names: [], events: [], subject_types: [] }))
      .catch(() => {});
  }, []);

  const hasActiveFilters =
    filters.search || filters.log_name || filters.event ||
    filters.subject_type || filters.date_from || filters.date_to;

  return (
    <div className="px-4 py-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Activity Log</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            A searchable audit trail of authentication, data changes and admin actions.
          </p>
        </div>
        <select
          value={filters.sort}
          onChange={(e) => updateFilter('sort', e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <input
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            placeholder="Search description, actor, IP..."
            className="flex-1 min-w-[220px] px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-400"
          />
          <select value={filters.log_name} onChange={(e) => updateFilter('log_name', e.target.value)}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white">
            <option value="">All categories</option>
            {facets.log_names.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <select value={filters.event} onChange={(e) => updateFilter('event', e.target.value)}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white">
            <option value="">All actions</option>
            {facets.events.map((ev) => <option key={ev} value={ev}>{ev}</option>)}
          </select>
          <select value={filters.subject_type} onChange={(e) => updateFilter('subject_type', e.target.value)}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white">
            <option value="">All models</option>
            {facets.subject_types.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <label className="text-xs text-gray-400">From</label>
          <input type="date" value={filters.date_from} onChange={(e) => updateFilter('date_from', e.target.value)}
                 className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
          <label className="text-xs text-gray-400">To</label>
          <input type="date" value={filters.date_to} onChange={(e) => updateFilter('date_to', e.target.value)}
                 className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
          {hasActiveFilters && (
            <button onClick={resetFilters}
                    className="ml-auto px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table / states */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent" />
            <p className="text-xs text-gray-400 mt-3">Loading activity…</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-sm font-semibold text-red-600">{error}</p>
            <button onClick={() => goToPage(1)}
                    className="mt-3 px-4 py-2 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl">
              Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm font-semibold text-gray-500">No activity found</p>
            <p className="text-xs text-gray-400 mt-1">
              {hasActiveFilters ? 'Try adjusting or clearing your filters.' : 'Actions will appear here as they happen.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Time', 'Actor', 'Event', 'Subject', 'Description', 'IP'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((log) => (
                  <tr key={log.id}
                      className="hover:bg-gray-50/80 cursor-pointer"
                      onClick={() => setSelected({ id: log.id, fallback: log })}>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{shortTime(log.created_at)}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-gray-800">{log.causer?.name || 'System'}</p>
                      {log.causer?.email && <p className="text-[10px] text-gray-400">{log.causer.email}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${EVENT_STYLES[log.event] || 'bg-gray-100 text-gray-600'}`}>
                        {log.event || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                      {log.subject?.type
                        ? <>{log.subject.type} <span className="text-gray-400">#{log.subject.id}</span></>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[280px] truncate" title={log.description}>
                      {log.description}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-gray-400 whitespace-nowrap">{log.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && meta.last_page > 1 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Showing {(meta.current_page - 1) * meta.per_page + 1}-
              {Math.min(meta.current_page * meta.per_page, meta.total)} of {meta.total}
            </p>
            <div className="flex gap-1">
              <button onClick={() => goToPage(meta.current_page - 1)} disabled={meta.current_page <= 1}
                      className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">Previous</button>
              <button onClick={() => goToPage(meta.current_page + 1)} disabled={meta.current_page >= meta.last_page}
                      className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <ActivityLogDrawer
          logId={selected.id}
          fallback={selected.fallback}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
