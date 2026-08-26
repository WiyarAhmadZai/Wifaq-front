import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { get, del, put, peekCache } from "../api/axios";
import Swal from "sweetalert2";
import { useAuth } from "../admin/context/AuthContext";
import ListExportActions from "./ListExportActions";
import Select2 from "./hr/Select2";
import { useI18n } from "../i18n/I18nContext";

export default function CrudPage({
  title,
  apiEndpoint,
  deleteEndpoint = null,
  listColumns,
  createRoute,
  editRoute,
  showRoute,
  idField = "id",
  extraHeaderButtons = null,
  searchable = false,
  searchFields = [],
  statusEndpoint = null,
  statusField = "status",
  statusOptions = [],
  statusSuffix = "",
  baseParams = {},
  /**
   * Optional dropdown filters shown next to the search box.
   * [{ key, label, options: [{ value, label }], allLabel? }]
   * Selected values are sent as query params (key=value) and reset to page 1.
   */
  filters = [],
  /**
   * Permission base name (e.g. "academic-terms", "parents"), or an array of
   * bases when a screen may be unlocked by more than one module. When provided,
   * Create/Edit/Delete/Status buttons are hidden unless the user holds the
   * corresponding `{base}.create | .update | .delete | .manage` permission on
   * ANY of the bases. If omitted, all buttons remain visible (legacy behaviour).
   */
  permissionBase = null,
  /**
   * Optional render-prop for extra buttons in the row Actions cell.
   * Signature: `(item, refresh) => ReactNode`. The `refresh` callback re-fetches
   * the list — call it after a mutation so the row updates immediately.
   */
  rowActions = null,
  /**
   * Columns for Excel / Print, when the export should carry MORE than the table
   * shows. Same shape as `listColumns`. Defaults to `listColumns`, so every
   * existing list keeps exporting exactly what it displays.
   *
   * A wide record (a communication log carries a dozen useful fields) is
   * unreadable if the table shows all of them, but an export that drops them is
   * a worse answer than a scrolling table — a printed sheet is where the long
   * tail actually gets read.
   */
  exportColumns = null,
}) {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  // Permission resolution. If no base provided → all true (legacy behavior).
  // Multiple bases are OR-ed: the Enrolled Students roster, for instance, is
  // unlocked by either `enrolled-students.*` or the wider `students.*`.
  const permissionBases = permissionBase
    ? (Array.isArray(permissionBase) ? permissionBase : [permissionBase])
    : [];
  const permCheck = (action) => {
    if (permissionBases.length === 0) return true;
    return permissionBases.some(
      (base) => hasPermission(`${base}.${action}`) || hasPermission(`${base}.manage`),
    );
  };
  const { t } = useI18n();

  const canCreate = permCheck("create");
  const canUpdate = permCheck("update");
  const canDelete = permCheck("delete");
  const canView = permCheck("view");

  // Highlight support: when arriving with ?highlight=ID, scroll that row into
  // view and ring it briefly so the user sees exactly which item the
  // notification was about.
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const [pulseActive, setPulseActive] = useState(false);
  const rowRefs = useRef({});

  /* -- Which page, which search, which filters: all of it lives in the URL --
   *
   * These used to be component state. React Router unmounts the list when the
   * user opens a record, so that state was gone the moment they left - Back
   * brought them to an unfiltered page 1 and they had to find their place
   * again. As query parameters the same three things ride along in the history
   * entry, so Back (and refresh, and a pasted link) reproduce the list exactly.
   *
   * Writes are `replace`, not push: a list keeps ONE history entry that always
   * carries its current filters, so Back leaves the list instead of stepping
   * backwards through every filter the user tried on the way here.
   */
  const filterKeys = filters.map((f) => f.key);
  const paramString = searchParams.toString();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const urlSearch = searchParams.get("q") || "";
  const filterValues = useMemo(() => {
    const out = {};
    filterKeys.forEach((k) => {
      const v = searchParams.get("f_" + k);
      if (v) out[k] = v;
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramString, filterKeys.join("|")]);

  const setParams = useCallback((patch) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(patch).forEach(([k, v]) => {
        const isDefault = v == null || v === "" || (k === "page" && Number(v) <= 1);
        if (isDefault) next.delete(k);
        else next.set(k, String(v));
      });
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  // Local mirror of the search box so typing stays responsive; debounced into
  // the URL below, and re-synced from it when Back changes the URL under us.
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  // Open the filter panel on arrival when the URL already carries filters, so
  // a restored (or shared) list shows WHY it is showing only these rows.
  const [filterOpen, setFilterOpen] = useState(() => filterKeys.some((k) => searchParams.get('f_' + k)));
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  const fetchItems = useCallback(async (page = 1, search = "") => {
    const params = new URLSearchParams();
    params.append("page", page);
    if (search) params.append("search", search);
    Object.entries(baseParams || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    Object.entries(filterValues || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const url = `${apiEndpoint}?${params.toString()}`;

    // Stale-while-revalidate: if this exact query is already cached locally,
    // paint it instantly (no spinner) and let the request below revalidate in
    // the background. The server answers 304 when nothing changed, or 200 with
    // fresh rows — either way the view converges without a blank loading state.
    const cached = peekCache(url);
    if (cached) {
      const cData = cached?.data || cached || [];
      setItems(Array.isArray(cData) ? cData : []);
      if (cached?.meta) setMeta(cached.meta);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const response = await get(url);
      const data = response.data?.data || response.data || [];
      setItems(Array.isArray(data) ? data : []);
      if (response.data?.meta) setMeta(response.data.meta);
    } catch (error) {
      console.error("Fetch error:", error);
      let errorMessage = "An unexpected error occurred";
      let errorTitle = "Error";
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        if (status === 500) { errorTitle = "Server Error (500)"; errorMessage = data?.message || "Internal server error."; }
        else if (status === 401) { errorTitle = "Unauthorized (401)"; errorMessage = "Please login to access this resource."; }
        else if (status === 403) { errorTitle = "Forbidden (403)"; errorMessage = "You do not have permission."; }
        else if (status === 404) { errorTitle = "Not Found (404)"; errorMessage = "Resource not found."; }
        else if (status === 422) { errorTitle = "Validation Error (422)"; errorMessage = data?.message || "Validation failed."; }
        else { errorTitle = `Error (${status})`; errorMessage = data?.message || `HTTP ${status} error`; }
      } else if (error.request) { errorTitle = "Network Error"; errorMessage = "Cannot connect to server."; }
      // If we already painted cached rows, keep them on-screen instead of
      // wiping to an error state — the user still sees the last-known-good data.
      if (!cached) {
        Swal.fire({ title: errorTitle, text: errorMessage, icon: "error", confirmButtonColor: "#0d9488" });
        setItems([]);
      }
    } finally { setLoading(false); }
  }, [apiEndpoint, JSON.stringify(baseParams), JSON.stringify(filterValues)]);

  // One fetch driven by the URL - covers the first paint, every search/filter/
  // page change, a refresh, and the Back button restoring an earlier query.
  useEffect(() => {
    fetchItems(page, urlSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramString, apiEndpoint, JSON.stringify(baseParams)]);

  /** Re-fetch the list exactly as it stands now (used after a mutation). */
  const refresh = useCallback(() => fetchItems(page, urlSearch), [fetchItems, page, urlSearch]);

  // Fetch EVERY page (respecting the current search + base filters) so the
  // Excel/Print export covers all records, not just the visible page.
  const fetchAllItems = useCallback(async () => {
    const all = [];
    let page = 1;
    let lastPage = 1;
    do {
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("per_page", 1000);
      if (urlSearch) params.append("search", urlSearch);
      Object.entries(baseParams || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") params.append(k, v);
      });
      Object.entries(filterValues || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") params.append(k, v);
      });
      const response = await get(`${apiEndpoint}?${params.toString()}`);
      const data = response.data?.data || response.data || [];
      if (Array.isArray(data)) all.push(...data);
      lastPage = response.data?.meta?.last_page || 1;
      page += 1;
    } while (page <= lastPage && page <= 200); // hard safety cap
    return all;
  }, [apiEndpoint, urlSearch, JSON.stringify(baseParams), JSON.stringify(filterValues)]);

  // Once items are loaded and the URL carries ?highlight=ID, scroll to that row
  // and pulse it for ~2.5s.
  useEffect(() => {
    if (!highlightId || items.length === 0) return;
    const target = rowRefs.current[String(highlightId)];
    if (!target) return;
    requestAnimationFrame(() => {
      try { target.scrollIntoView({ behavior: "smooth", block: "center" }); } catch {}
      setPulseActive(true);
    });
    const tmr = setTimeout(() => setPulseActive(false), 2500);
    return () => clearTimeout(tmr);
  }, [highlightId, items]);

  const handleSearch = (e) => setSearchQuery(e.target.value);

  // Typing is debounced into the URL (a new search always starts at page 1).
  useEffect(() => {
    if (searchQuery === urlSearch) return;
    const timer = setTimeout(() => setParams({ q: searchQuery, page: 1 }), 400);
    return () => clearTimeout(timer);
  }, [searchQuery, urlSearch, setParams]);

  // ...and the box follows the URL when Back or a pasted link changes it.
  useEffect(() => { setSearchQuery(urlSearch); }, [urlSearch]);

  const blankFilters = () => Object.fromEntries(filterKeys.map((k) => ["f_" + k, ""]));
  const setFilter = (key, value) => setParams({ ["f_" + key]: value, page: 1 });
  const clearAll = () => { setSearchQuery(""); setParams({ q: "", page: 1, ...blankFilters() }); };
  const clearFilters = () => setParams({ page: 1, ...blankFilters() });
  const activeFilterCount = Object.values(filterValues).filter((v) => v !== "" && v != null).length;

  // Human-readable summary of what is currently filtered, shown as removable
  // chips so the user can see (and undo) each choice without opening a menu.
  const activeFilterChips = filters
    .map((f) => {
      const value = filterValues[f.key];
      if (value === "" || value == null) return null;
      const option = (f.options || []).find((o) => String(o.value) === String(value));
      return { key: f.key, label: f.label, text: option?.label ?? value };
    })
    .filter(Boolean);

  const handlePageChange = (p) => {
    setParams({ page: p });
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({ title: "Delete this record?", text: "This action cannot be undone.", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", cancelButtonColor: "#6b7280", confirmButtonText: "Delete" });
    if (result.isConfirmed) {
      try {
        await del(`${deleteEndpoint ?? apiEndpoint}/${id}`);
        Swal.fire({ icon: "success", title: "Deleted", timer: 1500, showConfirmButton: false });
        refresh();
      } catch { Swal.fire("Error", "Failed to delete record.", "error"); }
    }
  };

  const handleOpenStatusModal = (item) => { setSelectedItem(item); setNewStatus(item[statusField] || ""); setShowStatusModal(true); };
  const handleCloseStatusModal = () => { setShowStatusModal(false); setSelectedItem(null); setNewStatus(""); };
  const handleStatusUpdate = async () => {
    if (!newStatus) { Swal.fire("Error", "Please select a status", "error"); return; }
    setSavingStatus(true);
    try {
      await put(`${statusEndpoint}/${selectedItem[idField]}${statusSuffix}`, { [statusField]: newStatus });
      Swal.fire({ icon: "success", title: "Status updated", timer: 1500, showConfirmButton: false });
      handleCloseStatusModal(); refresh();
    } catch (error) { Swal.fire("Error", error.response?.data?.message || "Failed to update status", "error"); }
    finally { setSavingStatus(false); }
  };

  // The page title doubles as a noun inside several sentences ("Total X",
  // "Search x…"). Translate it once here so every one of them reads naturally.
  const noun = t(title);
  const lowerNoun = noun.toLowerCase();

  const stats = [
    { label: t("Total {}", noun), value: meta.total, icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  ];

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">{noun}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{t("Manage {} records", lowerNoun)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ListExportActions getRows={fetchAllItems} columns={exportColumns || listColumns} title={title} />
          {extraHeaderButtons}
          {canCreate && createRoute && (
            <button onClick={() => navigate(createRoute)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              New Entry
            </button>
          )}
        </div>
      </div>

      {/* Stats and Search Row */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Stat card */}
        <div className="flex-shrink-0">
          {stats.map((s, i) => (
            <div key={s.label} className={`flex items-center gap-3 px-5 py-4 rounded-2xl border ${i === 0 ? "bg-teal-600 border-teal-600" : "bg-white border-teal-100"}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${i === 0 ? "bg-white/20" : "bg-teal-50"}`}>
                <svg className={`w-5 h-5 ${i === 0 ? "text-white" : "text-teal-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} /></svg>
              </div>
              <div>
                <p className={`text-[10px] font-medium ${i === 0 ? "text-teal-100" : "text-gray-500"}`}>{s.label}</p>
                <p className={`text-2xl font-bold leading-tight ${i === 0 ? "text-white" : "text-gray-800"}`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search bar */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input value={searchQuery} onChange={handleSearch}
                placeholder={t("Search {}...", lowerNoun)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white" />
            </div>
            {filters.length > 0 && (
              <button onClick={() => setFilterOpen((o) => !o)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${filterOpen || activeFilterCount ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-600 border-gray-200 hover:border-teal-300"}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                Filters
                {activeFilterCount > 0 && <span className="w-4 h-4 rounded-full bg-white text-teal-700 text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>}
                <svg className={`w-3.5 h-3.5 transition-transform ${filterOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
            )}
            {(searchQuery || activeFilterCount > 0) && (
              <button onClick={clearAll}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter panel — its own full-width row so every dropdown gets equal,
          comfortable space instead of being squeezed beside the search box. */}
      {filterOpen && filters.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2 min-w-0">
              <svg className="w-4 h-4 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Filter results</span>
              {activeFilterCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-teal-50 border border-teal-100 text-teal-700 text-[10px] font-bold">
                  {activeFilterCount} active
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {activeFilterCount > 0 && (
                <button onClick={clearFilters}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-gray-500 hover:text-teal-700 hover:bg-white transition-colors">
                  Reset
                </button>
              )}
              <button onClick={() => setFilterOpen(false)} title="Hide filters"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          {/* Every filter stays on ONE row and shares the width equally. The
              150px floor keeps a control readable; if the viewport is too
              narrow for all of them the wrapper scrolls sideways instead of
              wrapping onto a second line. */}
          <div className="p-4 overflow-x-auto">
            <div className="grid gap-x-4"
              style={{ gridTemplateColumns: `repeat(${filters.length}, minmax(150px, 1fr))` }}>
              {filters.map((f) => {
                const options = f.options || [];
                const isEmpty = options.length === 0;
                return (
                  <div key={f.key} className="min-w-0">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      <span className="truncate">{f.label}</span>
                      {!isEmpty && <span className="text-gray-300 font-medium normal-case tracking-normal">({options.length})</span>}
                    </label>
                    {/* Searchable (select2) dropdown — clearing it means "All". */}
                    <Select2
                      value={filterValues[f.key] ?? ""}
                      onChange={(v) => setFilter(f.key, v ?? "")}
                      options={options}
                      placeholder={isEmpty ? (f.emptyLabel || "No options") : (f.allLabel || "All")}
                      disabled={isEmpty}
                      size="sm"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {activeFilterChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-4 pb-4">
              {activeFilterChips.map((chip) => (
                <span key={chip.key}
                  className="inline-flex items-center gap-1.5 max-w-full pl-2.5 pr-1 py-1 rounded-full bg-teal-50 border border-teal-100 text-teal-800 text-[11px] font-medium">
                  <span className="text-teal-500 font-semibold">{chip.label}:</span>
                  <span className="truncate">{chip.text}</span>
                  <button onClick={() => setFilter(chip.key, "")} title={t("Remove {} filter", t(chip.label))}
                    className="w-4 h-4 rounded-full flex items-center justify-center text-teal-500 hover:bg-teal-600 hover:text-white transition-colors flex-shrink-0">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent" />
          <p className="mt-2 text-gray-400 text-xs">Loading...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">#</th>
                  {listColumns.map(col => (
                    <th key={col.key} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">{col.label}</th>
                  ))}
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item, index) => {
                  const isHighlighted = highlightId && String(item[idField]) === String(highlightId);
                  return (
                  <tr key={item[idField]}
                    ref={(el) => { if (el) rowRefs.current[String(item[idField])] = el; }}
                    className={
                      "transition-shadow duration-500 " +
                      (isHighlighted && pulseActive
                        ? "bg-teal-50 outline outline-2 outline-teal-400 outline-offset-[-2px] animate-pulse"
                        : "hover:bg-gray-50/80")
                    }>
                    <td className="px-4 py-3 text-xs font-medium text-teal-600">#{String((meta.current_page - 1) * meta.per_page + index + 1).padStart(4, "0")}</td>
                    {listColumns.map(col => (
                      <td key={col.key} className="px-4 py-3 text-sm text-gray-700">
                        {col.render ? col.render(item[col.key], item, col.isStatus ? handleOpenStatusModal : null) : item[col.key]}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      {/* nowrap keeps every action on ONE row — the table body
                          already scrolls horizontally when space is tight. */}
                      <div className="flex items-center justify-end gap-1 flex-nowrap whitespace-nowrap">
                        {rowActions && rowActions(item, refresh)}
                        {canView && showRoute && (
                          <button onClick={() => navigate(`${showRoute}/${item[idField]}`)}
                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="View">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>
                        )}
                        {canUpdate && editRoute && (
                          <button onClick={() => navigate(`${editRoute}/${item[idField]}`)}
                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Edit">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                        )}
                        {canUpdate && statusEndpoint && statusOptions.length > 0 && (
                          <button onClick={() => handleOpenStatusModal(item)}
                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Update Status">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </button>
                        )}
                        {canDelete && deleteEndpoint && (
                          <button onClick={() => handleDelete(item[idField])}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {items.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-sm font-medium text-gray-600">{searchQuery ? "No matching records" : "No records found"}</p>
              <p className="text-xs text-gray-400 mt-1">{searchQuery ? t("Try adjusting your search") : t("Create your first {} entry", lowerNoun)}</p>
              {searchQuery ? (
                <button onClick={() => { setSearchQuery(""); }}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors">Clear Search</button>
              ) : canCreate && createRoute ? (
                <button onClick={() => navigate(createRoute)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Create Entry
                </button>
              ) : null}
            </div>
          )}

          {/* Pagination */}
          {meta.last_page > 1 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Showing {(meta.current_page - 1) * meta.per_page + 1}-{Math.min(meta.current_page * meta.per_page, meta.total)} of {meta.total} records
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(meta.current_page - 1)}
                  disabled={meta.current_page <= 1}
                  className="px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: meta.last_page }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === meta.last_page || Math.abs(p - meta.current_page) <= 1)
                  .reduce((acc, p, i, arr) => {
                    if (i > 0 && p - arr[i - 1] > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span key={`dots-${i}`} className="px-1.5 text-xs text-gray-400">...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => handlePageChange(p)}
                        className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${
                          p === meta.current_page
                            ? "bg-teal-600 text-white"
                            : "text-gray-600 bg-white border border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => handlePageChange(meta.current_page + 1)}
                  disabled={meta.current_page >= meta.last_page}
                  className="px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {items.length > 0 && meta.last_page <= 1 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">Showing {meta.total} records</p>
            </div>
          )}
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 bg-teal-50 border-b border-teal-100">
              <h3 className="text-sm font-bold text-gray-800">Update Status</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Current Status</label>
                <div className="px-3 py-2 rounded-xl bg-teal-50 text-teal-700 text-sm font-medium capitalize">
                  {selectedItem?.[statusField]?.replace(/[-_]/g, " ")}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">New Status</label>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none">
                  <option value="">Select Status</option>
                  {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </div>
            <div className="px-5 py-4 bg-gray-50 flex justify-end gap-2 border-t border-gray-100">
              <button type="button" onClick={handleCloseStatusModal}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="button" onClick={handleStatusUpdate} disabled={savingStatus}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50">
                {savingStatus ? "Updating..." : "Update Status"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
