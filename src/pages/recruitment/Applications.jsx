import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { get, del, peekCache } from "../../api/axios";
import Swal from "sweetalert2";
import ListExportActions from "../../components/ListExportActions";

import { fmtDate } from "../../utils/formErrors";

const APP_EXPORT_COLS = [
  { key: "full_name", label: "Applicant" },
  { key: "job_posting.title", label: "Job Posting" },
  { key: "contact_number", label: "Contact" },
  { key: "source", label: "Source" },
  { key: "status", label: "Status" },
  { key: "created_at", label: "Applied", exportValue: (it) => (it.created_at ? String(it.created_at).slice(0, 10) : "") },
  // Screening aggregates — additive, existing columns untouched.
  { key: "reviews_count", label: "Reviewers", exportValue: (it) => it.reviews_count ?? 0 },
  { key: "average_rating", label: "Avg Rating", exportValue: (it) => (it.average_rating != null ? Number(it.average_rating).toFixed(1) : "") },
  { key: "recommended_count", label: "Recommend", exportValue: (it) => it.recommended_count ?? 0 },
  { key: "not_recommended_count", label: "Not Recommend", exportValue: (it) => it.not_recommended_count ?? 0 },
  { key: "hr_flagged_count", label: "HR Flag", exportValue: (it) => (it.hr_flagged_count > 0 ? "Needs HR Review" : "") },
];

const pipelineStages = [
  { key: "received", label: "Received", color: "bg-blue-500", light: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "screening", label: "Screening", color: "bg-amber-500", light: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "shortlisted", label: "Shortlisted", color: "bg-purple-500", light: "bg-purple-50 text-purple-700 border-purple-200" },
  { key: "interview", label: "Interview", color: "bg-cyan-500", light: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  { key: "offer", label: "Offer", color: "bg-indigo-500", light: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { key: "hired", label: "Hired", color: "bg-emerald-500", light: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "waiting_list", label: "Waiting List", color: "bg-orange-500", light: "bg-orange-50 text-orange-700 border-orange-200" },
  { key: "rejected", label: "Rejected", color: "bg-red-500", light: "bg-red-50 text-red-700 border-red-200" },
  { key: "withdrawn", label: "Withdrawn", color: "bg-gray-500", light: "bg-gray-50 text-gray-700 border-gray-200" },
];

const inputCls =
  "w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500";

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">{label}</label>
      {children}
    </div>
  );
}

/**
 * "" is the unset value throughout — it maps to no query parameter at all,
 * which is what keeps a cleared filter out of the URL.
 */
function Select({ value, onChange, options, allLabel, emptyHint }) {
  if (options.length === 0 && emptyHint) {
    return <p className="text-[11px] text-gray-400 italic py-1.5">{emptyHint}</p>;
  }
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/* Compact screening summary for a list row. Every value comes from aggregates
 * the list endpoint already computes (reviews_count, recommended_count,
 * not_recommended_count, hr_flagged_count, average_rating) — the row never
 * fetches anything of its own, so adding this column costs no extra request. */
const screeningSummary = (item) => {
  const total = item.reviews_count || 0;
  if (!total) return <span className="text-[10px] text-gray-400">Not screened</span>;

  const avg = item.average_rating != null ? Number(item.average_rating).toFixed(1) : null;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span className="text-[11px] font-bold text-amber-500">⭐ {avg ?? "—"}</span>
        <span className="text-[10px] font-semibold text-emerald-600">👍 {item.recommended_count || 0}</span>
        <span className="text-[10px] font-semibold text-red-500">👎 {item.not_recommended_count || 0}</span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-gray-400">{total} reviewer{total === 1 ? "" : "s"}</span>
        {item.hr_flagged_count > 0 && (
          <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[9px] font-bold whitespace-nowrap">
            ⚠ Needs HR Review
          </span>
        )}
      </div>
    </div>
  );
};

const statusBadge = (val) => {
  const stage = pipelineStages.find((s) => s.key === val);
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${stage?.light || "bg-gray-100 text-gray-700 border-gray-200"}`}>
      {val?.replace(/_/g, " ")}
    </span>
  );
};

export default function Applications() {
  const navigate = useNavigate();
  // URL query is the source of truth for page/filter/search, so the current
  // pagination page (and filter/search) survives a refresh or browser back.
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const activeFilter = searchParams.get("status") || "all";
  const urlSearch = searchParams.get("search") || "";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });
  const [stageCounts, setStageCounts] = useState({});
  const [options, setOptions] = useState(null);   // filter dropdown choices
  const [showFilters, setShowFilters] = useState(false);

  /**
   * Every filter lives in the URL, like page/status/search already did — so a
   * filtered shortlist can be bookmarked, refreshed, or pasted to a colleague
   * and still be the same list.
   */
  const FILTER_KEYS = [
    "job_posting_id", "gender", "native_language", "education_level",
    "field_of_study", "source", "min_experience", "max_experience",
    "min_age", "max_age", "met_requirements", "applied_within_days", "sort",
  ];
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, searchParams.get(k) || ""]));
  const activeFilterCount = FILTER_KEYS.filter((k) => k !== "sort" && filters[k]).length;

  // Merge changes into the URL; drop default values to keep the URL clean.
  const setParams = (patch) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(patch).forEach(([k, v]) => {
        const isDefault = v == null || v === "" || (k === "status" && v === "all") || (k === "page" && Number(v) <= 1);
        if (isDefault) next.delete(k);
        else next.set(k, String(v));
      });
      return next;
    });
  };

  const fetchItems = useCallback(async (p = 1, status = "all", search = "", extra = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", p);
      if (status !== "all") params.append("status", status);
      if (search) params.append("search", search);
      // Every category filter goes to the server — filtering the current page
      // client-side would hide matches sitting on page 2.
      Object.entries(extra).forEach(([k, v]) => { if (v) params.append(k, v); });

      const __url = `/recruitment/applications?${params.toString()}`;
      const __cached = peekCache(__url);
      if (__cached) {
        const __d = __cached?.data || [];
        setItems(Array.isArray(__d) ? __d : []);
        if (__cached?.meta) setMeta(__cached.meta);
        setLoading(false);
      }

      const response = await get(__url);
      const data = response.data?.data || [];
      setItems(Array.isArray(data) ? data : []);
      if (response.data?.meta) setMeta(response.data.meta);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /* Dropdown choices AND the pipeline tile counts, both computed server-side.
   *
   * The tiles used to be tallied in the browser from a `per_page=9999` fetch.
   * Once the API started clamping per_page to 100 that silently stopped
   * counting past the hundredth application — the tiles would have under-
   * reported with no visible error. status_counts is a GROUP BY over the whole
   * table, so it stays correct at any volume and costs one request instead of
   * a full-table download. */
  const fetchFilterOptions = useCallback(async () => {
    try {
      const r = await get("/recruitment/applications/filter-options");
      const data = r.data?.data || null;
      setOptions(data);

      const counts = {};
      pipelineStages.forEach((s) => { counts[s.key] = Number(data?.status_counts?.[s.key] ?? 0); });
      setStageCounts(counts);
    } catch {
      setOptions(null);
      setStageCounts({});
    }
  }, []);

  // Fetch whenever the URL (page/filter/search/categories) changes — also
  // covers the initial load and a refresh on any pagination page.
  // `searchParams.toString()` is the dependency so ANY filter change refires
  // it without listing thirteen keys here and forgetting one later.
  const paramString = searchParams.toString();
  useEffect(() => {
    const extra = Object.fromEntries(FILTER_KEYS.map((k) => [k, searchParams.get(k) || ""]));
    fetchItems(page, activeFilter, urlSearch, extra);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramString, fetchItems]);

  useEffect(() => { fetchFilterOptions(); }, [fetchFilterOptions]);

  // Export/print: fetch ALL matching applications (endpoint supports per_page).
  const fetchAllApplications = async () => {
    const params = new URLSearchParams();
    params.append("per_page", 9999);
    if (activeFilter !== "all") params.append("status", activeFilter);
    if (urlSearch) params.append("search", urlSearch);
    const r = await get(`/recruitment/applications?${params.toString()}`);
    return r.data?.data || [];
  };

  const handleSearch = (e) => setSearchQuery(e.target.value);

  // Debounce typing into the URL (resets to page 1 on a new search).
  useEffect(() => {
    if (searchQuery === urlSearch) return;
    const timer = setTimeout(() => setParams({ search: searchQuery, page: 1 }), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilter = (status) => {
    setParams({ status: activeFilter === status ? "all" : status, page: 1 });
  };

  const handlePageChange = (p) => {
    setParams({ page: p });
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?", text: "You will not be able to recover this record!",
      icon: "warning", showCancelButton: true, confirmButtonColor: "#0d9488", cancelButtonColor: "#ef4444", confirmButtonText: "Yes, delete it!",
    });
    if (result.isConfirmed) {
      try { await del(`/recruitment/applications/${id}`); } catch { /* */ }
      fetchItems(page, activeFilter, urlSearch);
      fetchFilterOptions();
      Swal.fire("Deleted!", "Application has been deleted.", "success");
    }
  };

  return (
    <div className="px-4 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Applications</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage candidates through the hiring pipeline</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input type="text" value={searchQuery} onChange={handleSearch} placeholder="Search candidates..."
              className="w-full sm:w-64 pl-10 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <button onClick={() => setShowFilters((v) => !v)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              activeFilterCount > 0
                ? "bg-teal-50 border-teal-300 text-teal-700"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
          <ListExportActions getRows={fetchAllApplications} columns={APP_EXPORT_COLS} title="Applications" />
          <button onClick={() => navigate("/recruitment/applications/create")}
            className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-1.5 font-medium text-xs">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Application
          </button>
        </div>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2 mb-5">
        {pipelineStages.map((stage) => {
          const count = stageCounts[stage.key] || 0;
          const isActive = activeFilter === stage.key;
          return (
            <button key={stage.key} onClick={() => handleFilter(stage.key)}
              className={`relative p-3 rounded-xl border-2 transition-all text-left ${
                isActive ? `${stage.light} border-current ring-2 ring-current/20` : "bg-white border-gray-100 hover:border-gray-200"
              }`}>
              <div className={`w-2 h-2 rounded-full ${stage.color} mb-2`} />
              <p className="text-lg font-bold text-gray-800">{count}</p>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{stage.label}</p>
            </button>
          );
        })}
      </div>

      {/* Category filters. Server-side, and mirrored into the URL so a
          shortlist can be bookmarked or sent to a colleague as a link. */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Field label="Job posting">
              <Select value={filters.job_posting_id} onChange={(v) => setParams({ job_posting_id: v, page: 1 })}
                options={(options?.job_postings || []).map((j) => ({ value: j.id, label: j.title }))} allLabel="Any posting" />
            </Field>

            <Field label="Gender">
              <Select value={filters.gender} onChange={(v) => setParams({ gender: v, page: 1 })}
                options={(options?.genders?.length ? options.genders : ["male", "female"])
                  .map((g) => ({ value: g, label: g.charAt(0).toUpperCase() + g.slice(1) }))}
                allLabel="Any gender" />
            </Field>

            <Field label="Native language">
              <Select value={filters.native_language} onChange={(v) => setParams({ native_language: v, page: 1 })}
                options={(options?.native_languages || []).map((l) => ({ value: l, label: l }))}
                allLabel="Any language"
                emptyHint="No languages recorded yet" />
            </Field>

            <Field label="Education degree">
              <Select value={filters.education_level} onChange={(v) => setParams({ education_level: v, page: 1 })}
                options={(options?.education_levels || []).map((e) => ({ value: e.value, label: e.label }))}
                allLabel="Any degree" />
            </Field>

            <Field label="Experience (years)">
              <div className="flex items-center gap-1.5">
                <input type="number" min="0" step="0.5" value={filters.min_experience} placeholder="min"
                  onChange={(e) => setParams({ min_experience: e.target.value, page: 1 })}
                  className={inputCls} />
                <span className="text-gray-400 text-xs">–</span>
                <input type="number" min="0" step="0.5" value={filters.max_experience} placeholder="max"
                  onChange={(e) => setParams({ max_experience: e.target.value, page: 1 })}
                  className={inputCls} />
              </div>
              {options?.experience_range && (
                <p className="text-[10px] text-gray-400 mt-0.5">
                  applicants range {options.experience_range.min}–{options.experience_range.max} yrs
                </p>
              )}
            </Field>

            <Field label="Age">
              <div className="flex items-center gap-1.5">
                <input type="number" min="16" max="80" value={filters.min_age} placeholder="min"
                  onChange={(e) => setParams({ min_age: e.target.value, page: 1 })} className={inputCls} />
                <span className="text-gray-400 text-xs">–</span>
                <input type="number" min="16" max="80" value={filters.max_age} placeholder="max"
                  onChange={(e) => setParams({ max_age: e.target.value, page: 1 })} className={inputCls} />
              </div>
            </Field>

            <Field label="Field of study">
              <input type="text" value={filters.field_of_study} placeholder="e.g. mathematics"
                onChange={(e) => setParams({ field_of_study: e.target.value, page: 1 })}
                className={inputCls} />
            </Field>

            <Field label="Source">
              <Select value={filters.source} onChange={(v) => setParams({ source: v, page: 1 })}
                options={(options?.sources || []).map((s) => ({ value: s, label: s.replace(/_/g, " ") }))}
                allLabel="Any source" />
            </Field>

            <Field label="Met requirements">
              <Select value={filters.met_requirements} onChange={(v) => setParams({ met_requirements: v, page: 1 })}
                options={[{ value: "true", label: "Met" }, { value: "false", label: "Not met" }]} allLabel="Either" />
            </Field>

            <Field label="Applied within">
              <Select value={filters.applied_within_days} onChange={(v) => setParams({ applied_within_days: v, page: 1 })}
                options={[
                  { value: "7", label: "Last 7 days" },
                  { value: "30", label: "Last 30 days" },
                  { value: "90", label: "Last 3 months" },
                ]} allLabel="Any time" />
            </Field>

            <Field label="Sort by">
              <Select value={filters.sort} onChange={(v) => setParams({ sort: v, page: 1 })}
                options={[
                  { value: "newest", label: "Newest first" },
                  { value: "oldest", label: "Oldest first" },
                  { value: "experience", label: "Most experienced" },
                  { value: "experience_asc", label: "Least experienced" },
                  { value: "name", label: "Name (A–Z)" },
                  { value: "youngest", label: "Youngest" },
                  { value: "oldest_age", label: "Oldest" },
                ]} allLabel="Newest first" />
            </Field>
          </div>

          {activeFilterCount > 0 && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
              <p className="text-[11px] text-gray-500">
                <strong>{meta.total}</strong> applicant(s) match {activeFilterCount} filter(s)
              </p>
              <button
                onClick={() => setParams(Object.fromEntries(FILTER_KEYS.map((k) => [k, ""])))}
                className="text-[11px] font-semibold text-teal-600 hover:text-teal-700">
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active Filter */}
      {activeFilter !== "all" && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-gray-500">Filtering by: <strong className="capitalize">{activeFilter.replace(/_/g, " ")}</strong></span>
          <button onClick={() => handleFilter(activeFilter)} className="text-xs text-teal-600 hover:text-teal-700 font-medium">Clear filter</button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent"></div>
          <p className="mt-2 text-gray-500 text-xs">Loading...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="bg-teal-50">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Applicant</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Job Posting</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Contact</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Source</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Screening</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Applied</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/recruitment/applications/show/${item.id}`)}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-[10px] flex-shrink-0">
                          {item.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-gray-800">{item.full_name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-600">{item.job_posting?.title || "-"}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-600">{item.contact_number}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-600 capitalize">{item.source?.replace(/_/g, " ")}</td>
                    <td className="px-3 py-2.5">{screeningSummary(item)}</td>
                    <td className="px-3 py-2.5 text-xs">{statusBadge(item.status)}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">{item.created_at ? fmtDate(item.created_at) : "-"}</td>
                    <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/recruitment/applications/show/${item.id}`)} className="p-1 text-teal-600 hover:bg-teal-50 rounded" title="View & Manage">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button onClick={() => navigate(`/recruitment/applications/edit/${item.id}`)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete">
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
            <div className="text-center py-8">
              <p className="text-gray-500 text-xs">No applications found</p>
            </div>
          )}

          {/* Pagination */}
          {meta.last_page > 1 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Showing {(meta.current_page - 1) * meta.per_page + 1}-{Math.min(meta.current_page * meta.per_page, meta.total)} of {meta.total}
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
        </div>
      )}
    </div>
  );
}
