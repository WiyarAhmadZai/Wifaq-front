import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { trashApi } from '../../api/trash';
import { peekCache } from '../../api/axios';
import { useAuth } from '../context/AuthContext';
import { toastSuccess, toastError, toastWarn } from '../../utils/toast';

/** Short, human local time for the "Deleted" cell. */
function shortTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/** "3 days ago" style hint so admins can spot stale items at a glance. */
function relativeTime(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.floor((Date.now() - then) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months}mo ago` : `${Math.floor(months / 12)}y ago`;
}

const EMPTY_META = { current_page: 1, last_page: 1, per_page: 15, total: 0 };

export default function Trash() {
  const { hasPermission } = useAuth();
  const canRestore = hasPermission('trash.restore') || hasPermission('trash.manage');
  const canPurge = hasPermission('trash.force-delete') || hasPermission('trash.manage');

  const [groups, setGroups] = useState([]);
  const [totalTrashed, setTotalTrashed] = useState(0);
  const [loadingResources, setLoadingResources] = useState(true);
  const [showEmpty, setShowEmpty] = useState(false);
  const [resourceFilter, setResourceFilter] = useState('');

  const [active, setActive] = useState(null); // resource key
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(EMPTY_META);
  const [loadingRows, setLoadingRows] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]); // ids
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(null); // row id whose preview is open

  // ---------------------------------------------------------------- loading --
  const loadResources = useCallback(async () => {
    try {
      const res = await trashApi.resources();
      const data = res.data?.data || {};
      setGroups(data.groups || []);
      setTotalTrashed(data.total_trashed || 0);
    } catch {
      toastError('Could not load the trash summary.');
    } finally {
      setLoadingResources(false);
    }
  }, []);

  useEffect(() => {
    // Paint instantly from cache, then revalidate.
    const cached = peekCache('/trash/resources');
    if (cached?.data) {
      setGroups(cached.data.groups || []);
      setTotalTrashed(cached.data.total_trashed || 0);
      setLoadingResources(false);
    }
    loadResources();
  }, [loadResources]);

  const loadRows = useCallback(async (resource, page = 1, term = '') => {
    if (!resource) return;
    setLoadingRows(true);
    try {
      const res = await trashApi.list(resource, { page, search: term });
      setRows(res.data?.data || []);
      setMeta(res.data?.meta || EMPTY_META);
    } catch (err) {
      setRows([]);
      setMeta(EMPTY_META);
      toastError(err.response?.data?.message || 'Could not load trashed records.');
    } finally {
      setLoadingRows(false);
    }
  }, []);

  // Debounced search within the active resource.
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => loadRows(active, 1, search), 400);
    return () => clearTimeout(timer);
  }, [search, active, loadRows]);

  const openResource = (key) => {
    setActive(key);
    setSelected([]);
    setExpanded(null);
    setSearch('');
    loadRows(key, 1, '');
  };

  /** After any mutation: refresh the rows AND the sidebar counts. */
  const refreshAll = useCallback(async () => {
    setSelected([]);
    setExpanded(null);
    await Promise.all([loadRows(active, meta.current_page, search), loadResources()]);
  }, [active, meta.current_page, search, loadRows, loadResources]);

  // ------------------------------------------------------------- mutations --
  const handleRestore = async (id) => {
    setBusy(true);
    try {
      const res = await trashApi.restore(active, id);
      toastSuccess(res.data?.message || 'Record restored.');
      await refreshAll();
    } catch (err) {
      toastError(err.response?.data?.message || 'Could not restore that record.');
    } finally {
      setBusy(false);
    }
  };

  const handleForceDelete = async (id, title) => {
    const confirmed = await Swal.fire({
      title: 'Delete permanently?',
      html: `<b>${title}</b> will be erased from the database.<br/>This cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Delete forever',
    });
    if (!confirmed.isConfirmed) return;

    setBusy(true);
    try {
      const res = await trashApi.forceDelete(active, id);
      toastSuccess(res.data?.message || 'Record permanently deleted.');
      await refreshAll();
    } catch (err) {
      toastError(err.response?.data?.message || 'Could not delete that record.');
    } finally {
      setBusy(false);
    }
  };

  /** Shared reporter for the two bulk actions — both can partially succeed. */
  const reportBulk = (res) => {
    const body = res.data || {};
    if (body.failures?.length) {
      toastWarn(body.message || 'Some records could not be processed.');
    } else {
      toastSuccess(body.message || 'Done.');
    }
  };

  const handleBulkRestore = async () => {
    setBusy(true);
    try {
      reportBulk(await trashApi.restoreMany(active, selected));
      await refreshAll();
    } catch (err) {
      toastError(err.response?.data?.message || 'Bulk restore failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleBulkForceDelete = async () => {
    const confirmed = await Swal.fire({
      title: `Delete ${selected.length} record(s) permanently?`,
      text: 'They will be erased from the database. This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Delete forever',
    });
    if (!confirmed.isConfirmed) return;

    setBusy(true);
    try {
      reportBulk(await trashApi.forceDeleteMany(active, selected));
      await refreshAll();
    } catch (err) {
      toastError(err.response?.data?.message || 'Bulk delete failed.');
    } finally {
      setBusy(false);
    }
  };

  // ---------------------------------------------------------------- derived --
  const visibleGroups = useMemo(() => {
    const term = resourceFilter.trim().toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        resources: g.resources.filter(
          (r) =>
            (showEmpty || r.count > 0 || r.key === active) &&
            (!term || r.label.toLowerCase().includes(term))
        ),
      }))
      .filter((g) => g.resources.length > 0);
  }, [groups, showEmpty, resourceFilter, active]);

  const activeResource = useMemo(
    () => groups.flatMap((g) => g.resources).find((r) => r.key === active) || null,
    [groups, active]
  );

  const allOnPageSelected = rows.length > 0 && selected.length === rows.length;
  const toggleAll = () => setSelected(allOnPageSelected ? [] : rows.map((r) => r.id));
  const toggleOne = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // ------------------------------------------------------------------- view --
  return (
    <div className="px-4 py-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Trash</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Deleted records from every module. Restore them, or remove them for good.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-teal-600 border border-teal-600">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-medium text-teal-100">Items in Trash</p>
              <p className="text-2xl font-bold leading-tight text-white">{totalTrashed}</p>
            </div>
          </div>
        </div>
      </div>

      {!canRestore && !canPurge && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs text-amber-800">
            You can view the trash but not restore or permanently delete records.
          </p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* ------------------------------------------------ resource sidebar */}
        <aside className="w-full lg:w-72 lg:flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-gray-100 space-y-2">
            <input
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
              placeholder="Find a record type..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            />
            <label className="flex items-center gap-2 text-[11px] text-gray-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showEmpty}
                onChange={(e) => setShowEmpty(e.target.checked)}
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              Show empty types
            </label>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loadingResources ? (
              <div className="text-center py-10">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-teal-600 border-t-transparent" />
              </div>
            ) : visibleGroups.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-10 px-4">
                {totalTrashed === 0 ? 'Trash is empty.' : 'No record types match.'}
              </p>
            ) : (
              visibleGroups.map((g) => (
                <div key={g.group}>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/60">
                    {g.group}
                  </p>
                  {g.resources.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => openResource(r.key)}
                      className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors ${
                        active === r.key ? 'bg-teal-50 border-l-2 border-teal-600' : 'hover:bg-gray-50 border-l-2 border-transparent'
                      }`}
                    >
                      <span className={`text-sm truncate ${active === r.key ? 'font-semibold text-teal-700' : 'text-gray-700'}`}>
                        {r.label}
                      </span>
                      <span
                        className={`flex-none text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          r.count > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {r.count}
                      </span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </aside>

        {/* ---------------------------------------------------- records panel */}
        <section className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {!active ? (
            <div className="text-center py-20 px-4">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-600">Pick a record type</p>
              <p className="text-xs text-gray-400 mt-1">
                Choose one on the left to see what has been deleted.
              </p>
            </div>
          ) : (
            <>
              {/* Panel header + search */}
              <div className="px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-gray-800 truncate">
                    {activeResource?.label || active}
                  </h2>
                  <p className="text-[11px] text-gray-400">{meta.total} deleted record(s)</p>
                </div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search deleted records..."
                  className="sm:ml-auto w-full sm:w-64 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>

              {/* Bulk action bar */}
              {selected.length > 0 && (
                <div className="px-4 py-2.5 bg-teal-50 border-b border-teal-100 flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-teal-800">{selected.length} selected</span>
                  <div className="ml-auto flex gap-2">
                    {canRestore && (
                      <button
                        onClick={handleBulkRestore}
                        disabled={busy}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                      >
                        Restore selected
                      </button>
                    )}
                    {canPurge && (
                      <button
                        onClick={handleBulkForceDelete}
                        disabled={busy}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                      >
                        Delete forever
                      </button>
                    )}
                    <button
                      onClick={() => setSelected([])}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {/* Rows */}
              {loadingRows ? (
                <div className="text-center py-16">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent" />
                  <p className="text-xs text-gray-400 mt-3">Loading…</p>
                </div>
              ) : rows.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <p className="text-sm font-medium text-gray-600">
                    {search ? 'No matching deleted records' : 'Nothing deleted here'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {search ? 'Try a different search.' : 'This record type has an empty trash.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-4 py-3 w-10">
                          <input
                            type="checkbox"
                            checked={allOnPageSelected}
                            onChange={toggleAll}
                            className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Record</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Deleted</th>
                        <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {rows.map((row) => (
                        <Fragment key={row.id}>
                          <tr className="hover:bg-gray-50/80 transition-colors">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selected.includes(row.id)}
                                onChange={() => toggleOne(row.id)}
                                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                                className="text-left group"
                                title="Show record details"
                              >
                                <span className="text-sm font-medium text-gray-800 group-hover:text-teal-700">
                                  {row.title}
                                </span>
                                <span className="block text-[11px] text-gray-400">ID #{row.id}</span>
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-700">{shortTime(row.deleted_at)}</span>
                              <span className="block text-[11px] text-gray-400">{relativeTime(row.deleted_at)}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                {canRestore && (
                                  <button
                                    onClick={() => handleRestore(row.id)}
                                    disabled={busy}
                                    className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg disabled:opacity-40 transition-colors"
                                    title="Restore"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                  </button>
                                )}
                                {canPurge && (
                                  <button
                                    onClick={() => handleForceDelete(row.id, row.title)}
                                    disabled={busy}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-40 transition-colors"
                                    title="Delete permanently"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {expanded === row.id && (
                            <tr className="bg-gray-50/60">
                              <td />
                              <td colSpan={3} className="px-4 py-3">
                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                                  {Object.entries(row.preview || {}).map(([k, v]) => (
                                    <div key={k} className="flex gap-2 text-[11px] min-w-0">
                                      <dt className="font-semibold text-gray-500 flex-none">{k}</dt>
                                      <dd className="text-gray-700 truncate">{v === null ? '—' : String(v)}</dd>
                                    </div>
                                  ))}
                                </dl>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {meta.last_page > 1 && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    Page {meta.current_page} of {meta.last_page} · {meta.total} records
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => loadRows(active, meta.current_page - 1, search)}
                      disabled={meta.current_page <= 1 || loadingRows}
                      className="px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => loadRows(active, meta.current_page + 1, search)}
                      disabled={meta.current_page >= meta.last_page || loadingRows}
                      className="px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
