import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { get, del, post, peekCache } from "../../api/axios";
import Swal from "sweetalert2";
import ListExportActions from "../../components/ListExportActions";
import { useAuth } from "../../admin/context/AuthContext";

import { fmtDate } from "../../utils/formErrors";

const APP_EXPORT_COLS = [
  { key: "full_name", label: "Applicant" },
  { key: "job_posting.title", label: "Job Posting" },
  { key: "contact_number", label: "Contact" },
  { key: "source", label: "Source" },
  { key: "status", label: "Status" },
  { key: "attendance", label: "Exam Attendance", exportValue: (it) => ATTENDANCE_OPTIONS.find((o) => o.value === attendanceOf(it))?.label || "" },
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

/**
 * Ready-made bulk emails. Placeholders are filled per applicant on the server:
 * {name} {position} {date} {time} {location}. `confirm` turns on "ask them to
 * confirm attendance" — the email then carries a personal confirm link.
 */
const EMAIL_TEMPLATES = [
  {
    key: "written_test", label: "Written test invitation", confirm: true,
    subject: "Invitation to the written test — {position}",
    message: "Thank you for applying for the {position} position at Wifaq Education Network.\n\nWe are pleased to invite you to a written test:\n\nDate: {date}\nTime: {time}\nLocation: {location}\n\nPlease arrive 15 minutes early and bring your ID card (Tazkira) and a pen.",
  },
  {
    key: "interview", label: "Interview invitation", confirm: true,
    subject: "Interview invitation — {position}",
    message: "Thank you for your interest in the {position} position.\n\nWe would like to invite you to an interview:\n\nDate: {date}\nTime: {time}\nLocation: {location}\n\nPlease bring your ID card (Tazkira) and copies of your certificates.",
  },
  {
    key: "under_review", label: "Application received / under review", confirm: false,
    subject: "Your application for {position}",
    message: "Thank you for applying for the {position} position at Wifaq Education Network.\n\nWe have received your application and it is under review. We will contact you about the next step.",
  },
  {
    key: "not_selected", label: "Not selected", confirm: false,
    subject: "Your application for {position}",
    message: "Thank you for your interest in the {position} position and for the time you gave to your application.\n\nAfter careful review, we will not be moving forward with your application at this time. We encourage you to apply for future openings.",
  },
];

const ATTENDANCE_OPTIONS = [
  { value: "coming", label: "Coming (confirmed)" },
  { value: "not_coming", label: "Not coming (declined)" },
  { value: "awaiting_response", label: "Awaiting response" },
  { value: "not_invited", label: "Not invited" },
];

const attendanceOf = (item) => {
  const invitation = item.latest_invitation;
  if (!invitation) return "not_invited";
  if (invitation.confirmed_at) return "coming";
  if (invitation.declined_at) return "not_coming";
  return "awaiting_response";
};

const attendanceBadge = (item) => {
  const invitation = item.latest_invitation;
  const state = attendanceOf(item);
  const styles = {
    coming: "bg-emerald-100 text-emerald-700",
    not_coming: "bg-red-100 text-red-700",
    awaiting_response: "bg-sky-100 text-sky-700",
    not_invited: "bg-gray-100 text-gray-500",
  };
  const labels = {
    coming: "Coming",
    not_coming: "Not coming",
    awaiting_response: "Awaiting response",
    not_invited: "Not invited",
  };
  const titles = {
    coming: `Confirmed attending: ${invitation?.subject || "latest invitation"}`,
    not_coming: `Declined: ${invitation?.subject || "latest invitation"}`,
    awaiting_response: `No response yet: ${invitation?.subject || "latest invitation"}`,
    not_invited: "No exam or interview invitation has been sent yet",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap ${styles[state]}`} title={titles[state]}>
      {labels[state]}
    </span>
  );
};

const BLANK_EMAIL = { template: "", subject: "", message: "", ask_confirmation: false, event_at: "", location: "" };

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

/* Which applications this reviewer has already opened.
 *
 * Held per user id so a shared workstation never shows one recruiter the
 * other's read state, and kept client-side because "have I looked at this"
 * is a personal reading aid, not shared workflow state — writing it onto the
 * record would make an application look handled to the whole team the moment
 * one person opened it. Status is what the team shares; this is not. */
/* How far a candidate has been taken, as a colour.
 *
 * Recruiters asked to be able to tell at a glance who still needs looking at.
 * The row tint answers exactly that, and it is derived from shared record
 * state — the screening reviews on file plus the pipeline status — so every
 * recruiter sees the same colours. (The amber dot beside the name is the
 * separate, per-person "I have not opened this one yet" marker.)
 *
 *   green  — brand new: nobody has screened or moved this application yet
 *   blue   — screened / reviewed: at least one review is in, or the candidate
 *            has been moved on down the pipeline
 *   plain  — settled: hired, rejected, withdrawn or parked on the waiting list;
 *            nothing is waiting on anybody, so the highlight comes off
 */
const SETTLED_STATUSES = ["hired", "rejected", "withdrawn", "waiting_list"];
// Past the screening stage: whatever the review count says, somebody has
// clearly looked at this person and decided to take them further.
const ADVANCED_STATUSES = ["shortlisted", "interview", "offer"];

const reviewStateOf = (item) => {
  if (SETTLED_STATUSES.includes(item.status)) return "settled";
  // A recorded review is the real signal. Note that status `screening` on its
  // own does NOT count — it means "being screened", and the whole point of the
  // green row is to show who is still waiting for that to actually happen.
  if ((item.reviews_count || 0) > 0 || ADVANCED_STATUSES.includes(item.status)) return "reviewed";
  return "new";
};

const REVIEW_STATE = {
  new: {
    label: "New — not screened",
    hint: "No screening or candidate review recorded yet",
    row: "bg-emerald-50 hover:bg-emerald-100/70",
    dot: "bg-emerald-500",
    avatar: "bg-emerald-100 text-emerald-800",
    name: "font-bold text-gray-900",
    chip: "bg-emerald-100 text-emerald-800",
  },
  reviewed: {
    label: "Screened / reviewed",
    hint: "A screening or candidate review is on file, or the candidate has been shortlisted",
    row: "bg-sky-50 hover:bg-sky-100/70",
    dot: "bg-sky-500",
    avatar: "bg-sky-100 text-sky-800",
    name: "font-semibold text-gray-800",
    chip: "bg-sky-100 text-sky-800",
  },
  settled: {
    label: "Closed",
    hint: "Hired, rejected, withdrawn or on the waiting list",
    row: "bg-white hover:bg-gray-50",
    dot: "bg-gray-300",
    avatar: "bg-gray-100 text-gray-500",
    name: "font-medium text-gray-500",
    chip: "bg-gray-100 text-gray-600",
  },
};

const viewedKey = (userId) => `recruitment.viewedApplications.${userId ?? "anon"}`;

const loadViewed = (userId) => {
  try {
    const raw = localStorage.getItem(viewedKey(userId));
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.map(Number) : []);
  } catch {
    return new Set(); // storage disabled or corrupt — treat everything as new
  }
};

const saveViewed = (userId, ids) => {
  try {
    // Bounded so the entry cannot grow forever; oldest ids drop off first.
    localStorage.setItem(viewedKey(userId), JSON.stringify([...ids].slice(-3000)));
  } catch { /* quota or private mode — the highlight is cosmetic, so ignore */ }
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
  const { user, hasPermission } = useAuth();
  const userId = user?.id;
  // Bulk email: same grant the backend route checks.
  const canEmail = hasPermission(["applications.email", "applications.manage"]);
  // id → name, so the selection survives moving between pages and the
  // email form can show who will receive it.
  const [selected, setSelected] = useState(() => new Map());
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailForm, setEmailForm] = useState(BLANK_EMAIL);
  const [selectingAll, setSelectingAll] = useState(false);
  const [sending, setSending] = useState(false);
  const [viewed, setViewed] = useState(() => loadViewed(userId));

  // Re-read on user change so a logout/login in the same tab does not carry
  // the previous person's highlights over.
  useEffect(() => { setViewed(loadViewed(userId)); }, [userId]);

  const openApplication = useCallback((id) => {
    setViewed((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev).add(id);
      saveViewed(userId, next);
      return next;
    });
    navigate(`/recruitment/applications/show/${id}`);
  }, [navigate, userId]);
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
    "job_posting_id", "review", "gender", "native_language", "education_level",
    "field_of_study", "source", "attendance", "min_experience", "max_experience",
    "min_age", "max_age", "met_requirements", "applied_within_days",
    "applied_from", "applied_to", "sort",
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

  // A new search / status / filter is a different list: drop the selection so
  // nobody who is no longer on screen gets emailed. Changing PAGE keeps it, so
  // HR can pick people from several pages.
  const listKey = (() => {
    const p = new URLSearchParams(paramString);
    p.delete("page");
    return p.toString();
  })();
  useEffect(() => { setSelected(new Map()); }, [listKey]);

  const toggleOne = (item, checked) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (checked) next.set(item.id, item.full_name); else next.delete(item.id);
      return next;
    });
  };
  const pageAllSelected = items.length > 0 && items.every((it) => selected.has(it.id));
  const togglePage = (checked) => {
    setSelected((prev) => {
      const next = new Map(prev);
      items.forEach((it) => { if (checked) next.set(it.id, it.full_name); else next.delete(it.id); });
      return next;
    });
  };

  // Everyone the current search / status / filters match — every page, not
  // just the one on screen (e.g. all who applied between two dates).
  const selectAllMatching = async () => {
    setSelectingAll(true);
    try {
      const params = new URLSearchParams(paramString);
      params.delete("page");
      params.delete("sort");
      const r = await get(`/recruitment/applications/matching-ids?${params.toString()}`, { cache: false });
      const next = new Map();
      (r.data?.data || []).forEach((a) => next.set(a.id, a.full_name));
      setSelected(next);
      if ((r.data?.total || 0) > next.size) {
        Swal.fire("Limit reached", `Selected the first ${next.size} of ${r.data.total}. Narrow the filters to email the rest.`, "info");
      }
    } catch {
      Swal.fire("Error", "Could not select the matching applicants.", "error");
    } finally {
      setSelectingAll(false);
    }
  };

  const applyTemplate = (key) => {
    const t = EMAIL_TEMPLATES.find((x) => x.key === key);
    setEmailForm((f) => t
      ? { ...f, template: key, subject: t.subject, message: t.message, ask_confirmation: t.confirm }
      : { ...f, template: "" });
  };

  const sendEmail = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const r = await post("/recruitment/applications/bulk-email", {
        application_ids: [...selected.keys()],
        subject: emailForm.subject.trim(),
        message: emailForm.message.trim(),
        ask_confirmation: emailForm.ask_confirmation,
        event_at: emailForm.event_at || null,
        location: emailForm.location.trim() || null,
      });
      const d = r.data?.data || {};
      const notes = [
        d.skipped?.length ? `No valid email: ${d.skipped.join(", ")}` : "",
        d.failed?.length ? `Failed: ${d.failed.join(", ")}` : "",
      ].filter(Boolean).join("\n");
      setEmailOpen(false);
      setEmailForm(BLANK_EMAIL);
      setSelected(new Map());
      // Refresh so the attendance badges appear.
      fetchItems(page, activeFilter, urlSearch, Object.fromEntries(FILTER_KEYS.map((k) => [k, searchParams.get(k) || ""])));
      Swal.fire({
        icon: notes ? "warning" : "success",
        title: `Email sent to ${d.queued || 0} applicant(s)`,
        text: notes || undefined,
        confirmButtonColor: "#0d9488",
      });
    } catch (err) {
      const d = err.response?.data?.data;
      const extra = d?.skipped?.length ? `\nNo valid email: ${d.skipped.join(", ")}` : "";
      Swal.fire("Email not sent", (err.response?.data?.message || "Could not send the email.") + extra, "error");
    } finally {
      setSending(false);
    }
  };

  // Export/print: the API caps per_page at 100, so fetch every page using
  // the same search, status, category filters and sort as the visible list.
  const fetchAllApplications = async () => {
    const params = new URLSearchParams(paramString);
    params.delete("page");
    params.delete("per_page");
    params.set("per_page", "100");

    const rows = [];
    let currentPage = 1;
    let lastPage = 1;

    do {
      params.set("page", currentPage);
      const r = await get(`/recruitment/applications?${params.toString()}`, { cache: false });
      const pageRows = r.data?.data;
      if (Array.isArray(pageRows)) rows.push(...pageRows);
      lastPage = Math.max(currentPage, Number(r.data?.meta?.last_page) || currentPage);
      currentPage += 1;
    } while (currentPage <= lastPage);

    return rows;
  };

  const handleSearch = (e) => setSearchQuery(e.target.value);

  // Debounce typing into the URL (resets to page 1 on a new search).
  useEffect(() => {
    if (searchQuery === urlSearch) return;
    const timer = setTimeout(() => setParams({ search: searchQuery, page: 1 }), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Only the rows on screen — the list is paginated, so a global figure
  // would not match what the reviewer can actually see and act on.
  const unviewedCount = useMemo(() => items.filter((it) => !viewed.has(it.id)).length, [items, viewed]);

  const reviewCounts = useMemo(() => {
    const acc = { new: 0, reviewed: 0, settled: 0 };
    items.forEach((it) => { acc[reviewStateOf(it)] += 1; });
    return acc;
  }, [items]);

  const markAllViewed = useCallback(() => {
    setViewed((prev) => {
      const next = new Set(prev);
      items.forEach((it) => next.add(it.id));
      saveViewed(userId, next);
      return next;
    });
  }, [items, userId]);

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
      fetchItems(page, activeFilter, urlSearch, Object.fromEntries(FILTER_KEYS.map((k) => [k, searchParams.get(k) || ""])));
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
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input type="text" value={searchQuery} onChange={handleSearch} placeholder="Search candidates..."
              className="w-full sm:w-64 pl-10 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <select
            aria-label="Filter by exam attendance"
            title="Show applicants who are coming, not coming, awaiting a response, or not invited"
            value={filters.attendance}
            onChange={(e) => setParams({ attendance: e.target.value, page: 1 })}
            className={`w-full sm:w-44 px-3 py-1.5 rounded-lg border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              filters.attendance ? "border-teal-300 bg-teal-50 text-teal-700" : "border-gray-200 bg-white text-gray-600"
            }`}>
            <option value="">All attendance</option>
            {ATTENDANCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
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
          {canEmail && (
            <button type="button" onClick={() => setEmailOpen(true)} disabled={selected.size === 0}
              title={selected.size === 0 ? "Tick applicants in the list first" : undefined}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 font-medium text-xs">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email selected ({selected.size})
            </button>
          )}
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

            <Field label="Review / HR flag">
              <Select value={filters.review} onChange={(v) => setParams({ review: v, page: 1 })}
                options={[
                  { value: "recommended", label: "👍 Recommended" },
                  { value: "flagged", label: "🚩 Flagged for HR review" },
                  { value: "recommended_or_flagged", label: "Recommended or flagged" },
                  { value: "not_recommended", label: "👎 Not recommended" },
                  { value: "unreviewed", label: "Not reviewed yet" },
                ]}
                allLabel="Any review" />
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

            {/* A date range — "everyone who applied from the 1st to the 15th". */}
            <Field label="Applied from">
              <input type="date" value={filters.applied_from} max={filters.applied_to || undefined}
                onChange={(e) => setParams({ applied_from: e.target.value, page: 1 })} className={inputCls} />
            </Field>
            <Field label="Applied to">
              <input type="date" value={filters.applied_to} min={filters.applied_from || undefined}
                onChange={(e) => setParams({ applied_to: e.target.value, page: 1 })} className={inputCls} />
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

      {/* Legend for the row colours. Without it the tints are just decoration —
        * with it a recruiter can read the whole page in one glance. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
        {["new", "reviewed", "settled"].map((key) => {
          const conf = REVIEW_STATE[key];
          return (
            <span key={key} className="inline-flex items-center gap-1.5 text-[11px] text-gray-600" title={conf.hint}>
              <span className={`w-2.5 h-2.5 rounded-sm ${conf.dot}`} />
              <span className="font-semibold">{conf.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${conf.chip}`}>{reviewCounts[key]}</span>
            </span>
          );
        })}

        {/* Separate, personal marker: rows this recruiter has never opened. */}
        {unviewedCount > 0 && (
          <span className="inline-flex items-center gap-2 ml-auto">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              {unviewedCount} you have not opened
            </span>
            <button onClick={markAllViewed} className="text-xs text-teal-600 hover:text-teal-700 font-medium">Mark all as viewed</button>
          </span>
        )}
      </div>

      {/* Selection across pages: the page checkbox picks this page; this
          picks everyone the filters match (e.g. a date range). */}
      {canEmail && selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
          <span><strong>{selected.size}</strong> selected.</span>
          {meta.total > selected.size && (
            <button type="button" onClick={selectAllMatching} disabled={selectingAll}
              className="font-semibold underline hover:text-blue-900 disabled:opacity-50">
              {selectingAll ? "Selecting…" : `Select all ${meta.total} matching the current filters`}
            </button>
          )}
          <button type="button" onClick={() => setSelected(new Map())} className="ms-auto text-blue-700 hover:underline">
            Clear selection
          </button>
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
                  {canEmail && (
                    <th className="px-3 py-2 w-8">
                      <input type="checkbox" checked={pageAllSelected} onChange={(e) => togglePage(e.target.checked)}
                        aria-label="Select all applicants on this page" title="Select all on this page"
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                    </th>
                  )}
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
                {items.map((item) => {
                  const state = reviewStateOf(item);
                  const conf = REVIEW_STATE[state];
                  const unopened = !viewed.has(item.id);
                  return (
                  <tr key={item.id}
                      className={`cursor-pointer transition-colors ${conf.row}`}
                      title={conf.hint}
                      onClick={() => openApplication(item.id)}>
                    {canEmail && (
                      <td className="px-3 py-2.5 w-8" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(item.id)}
                          onChange={(e) => toggleOne(item, e.target.checked)}
                          aria-label={`Select ${item.full_name}`}
                          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                      </td>
                    )}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        {/* Colour alone would not survive a colour-vision
                          * difference, so the bar, the label and the weight
                          * carry the same information. */}
                        <span className={`w-1 h-8 rounded-full flex-shrink-0 ${conf.dot}`} aria-hidden="true" />
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${conf.avatar}`}>
                          {item.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className={`text-xs ${conf.name}`}>{item.full_name}</span>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${conf.chip}`}>{conf.label}</span>
                            {unopened && (
                              <span className="text-[9px] font-semibold text-amber-600" title="You have not opened this one">
                                &bull; unopened
                              </span>
                            )}
                            {/* WEN has met this person before. Worth knowing at
                                the list, not after someone has read the whole
                                application as if it were a first contact. */}
                            {item.is_former_staff ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700"
                                title="This applicant has worked at WEN before — open to see the exit reason">
                                former staff
                              </span>
                            ) : item.has_history ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700"
                                title="This person has applied to WEN before">
                                applied before
                              </span>
                            ) : null}
                            {/* Response to the latest exam / interview invitation. */}
                            {attendanceBadge(item)}
                          </div>
                        </div>
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
                        <button onClick={() => openApplication(item.id)} className="p-1 text-teal-600 hover:bg-teal-50 rounded" title="View & Manage">
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
                  );
                })}
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

      {/* Bulk email */}
      {emailOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={sendEmail} className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800">Email {selected.size} applicant{selected.size === 1 ? "" : "s"}</h3>
              <p className="text-xs text-gray-500 mt-1">Each person receives a separate, private email addressed by name.</p>
              <div className="mt-2 max-h-20 overflow-y-auto text-[11px] text-gray-600">
                {[...selected.values()].join(", ")}
              </div>
            </div>
            <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
              <div>
                <label htmlFor="bulk-template" className="block text-xs font-medium text-gray-700 mb-1">Template</label>
                <select id="bulk-template" value={emailForm.template} onChange={(e) => applyTemplate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Custom message</option>
                  {EMAIL_TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="bulk-subject" className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
                <input id="bulk-subject" type="text" maxLength={200} required value={emailForm.subject}
                  onChange={(e) => setEmailForm((f) => ({ ...f, subject: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label htmlFor="bulk-message" className="block text-xs font-medium text-gray-700 mb-1">Message</label>
                <textarea id="bulk-message" rows={7} maxLength={10000} required value={emailForm.message}
                  onChange={(e) => setEmailForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder={'Starts with "Dear <name>," automatically.'}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
                <p className="mt-1 text-[10px] text-gray-400">
                  Filled in for each applicant: <code>{"{name}"}</code> <code>{"{position}"}</code> <code>{"{date}"}</code> <code>{"{time}"}</code> <code>{"{location}"}</code>
                </p>
              </div>

              <label className="flex items-start gap-2 rounded-lg border border-gray-200 px-3 py-2 cursor-pointer">
                <input type="checkbox" checked={emailForm.ask_confirmation}
                  onChange={(e) => setEmailForm((f) => ({ ...f, ask_confirmation: e.target.checked }))}
                  className="mt-0.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                <span className="text-xs text-gray-700">
                  <span className="font-semibold">Ask applicants to confirm whether they will attend</span>
                  <span className="block text-[10px] text-gray-400">Each email gets a private link to accept or decline. Filter the list by attendance to see each group.</span>
                </span>
              </label>

              {(emailForm.ask_confirmation || /\{(date|time|location)\}/.test(emailForm.subject + emailForm.message)) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="bulk-event-at" className="block text-xs font-medium text-gray-700 mb-1">
                      Date &amp; time {emailForm.ask_confirmation && <span className="text-red-500">*</span>}
                    </label>
                    <input id="bulk-event-at" type="datetime-local" value={emailForm.event_at}
                      required={emailForm.ask_confirmation}
                      onChange={(e) => setEmailForm((f) => ({ ...f, event_at: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label htmlFor="bulk-location" className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                    <input id="bulk-location" type="text" maxLength={255} value={emailForm.location}
                      onChange={(e) => setEmailForm((f) => ({ ...f, location: e.target.value }))}
                      placeholder="e.g. Wifaq main campus, Hall 2"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2 rounded-b-lg">
              <button type="button" onClick={() => setEmailOpen(false)} disabled={sending}
                className="px-4 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={sending || !emailForm.subject.trim() || !emailForm.message.trim()}
                className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {sending ? "Sending..." : "Send email"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
