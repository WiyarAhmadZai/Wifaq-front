import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Swal from "sweetalert2";
import { get, put } from "../../api/axios";
import ListExportActions from "../../components/ListExportActions";
import { useAuth } from "../../admin/context/AuthContext";
import {
  METHODS, FOLLOW_UP_STATUS, Pill, labelOf, fmtDate, fmtDateTime,
  familyLabel, studentLabel, isOverdue, TEAL, MUTED, BORDER,
} from "./parentCommsUi";

/**
 * Follow-ups — every promise made to a parent, across every family.
 *
 * A board rather than a CrudPage: the rows are not created or edited here, they
 * are worked. What this screen does is show what is open, what is late, and let
 * an authorized user close or cancel one.
 *
 * Excel + Print come from the same ListExportActions every list page uses, and
 * `fetchAll` pulls every page so an export is the whole filtered board — not
 * the fifteen rows currently on screen.
 */

const STAT_CARDS = [
  { key: "pending", label: "Pending", filled: true },
  { key: "overdue", label: "Overdue" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

/** One column config, shared by the table and both exports. */
const COLUMNS = [
  {
    key: "action", label: "Follow-up action",
    exportValue: (r) => r.action || "",
  },
  {
    key: "family", label: "Family",
    exportValue: (r) => familyLabel(r.communication?.family),
  },
  {
    key: "student", label: "Student",
    exportValue: (r) => (r.communication?.student ? studentLabel(r.communication.student) : ""),
  },
  {
    key: "subject", label: "From communication",
    exportValue: (r) => r.communication?.subject || "",
  },
  {
    key: "contacted_at", label: "Contact date",
    exportValue: (r) => fmtDateTime(r.communication?.contacted_at),
  },
  {
    key: "method", label: "Method",
    exportValue: (r) => labelOf(METHODS, r.communication?.method),
  },
  {
    key: "due_date", label: "Due",
    exportValue: (r) => fmtDate(r.due_date),
  },
  {
    key: "assignee", label: "Responsible staff",
    exportValue: (r) => r.assignee?.name || "Unassigned",
  },
  {
    key: "status", label: "Status",
    exportValue: (r) => `${labelOf(FOLLOW_UP_STATUS, r.status)}${isOverdue(r) ? " (overdue)" : ""}`,
  },
  {
    key: "completed_at", label: "Closed on",
    exportValue: (r) => (r.completed_at ? fmtDate(r.completed_at) : ""),
  },
  {
    key: "notes", label: "Notes",
    exportValue: (r) => r.notes || "",
  },
];

export default function ParentFollowUps() {
  const { hasPermission } = useAuth();
  const canFollowUp =
    hasPermission("parent-communications.follow-up") || hasPermission("parent-communications.manage");

  // The RULES table in pathPermissions.js can only demand `.view` on this
  // path (see the comment there), so the finer gate lives here. The backend
  // enforces the same permission on every endpoint this page calls.
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({ pending: 0, overdue: 0, completed: 0, cancelled: 0 });
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [filters, setFilters] = useState({ status: "pending", overdue: false, search: "" });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const queryString = useCallback((overrides = {}) => {
    const p = new URLSearchParams();
    const f = { ...filters, ...overrides };
    if (f.status) p.append("status", f.status);
    if (f.overdue) p.append("overdue", "1");
    if (f.search) p.append("search", f.search);
    p.append("page", overrides.page ?? page);
    if (overrides.per_page) p.append("per_page", overrides.per_page);
    return p.toString();
  }, [filters, page]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get(`/parent-communications/follow-ups?${queryString()}`);
      setRows(res.data?.data || []);
      setStats(res.data?.stats || {});
      setMeta(res.data?.meta || {});
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not load the follow-ups.", "error");
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => { load(); }, [load]);

  /** Every page of the CURRENT filter — what Excel and Print receive. */
  const fetchAll = async () => {
    const res = await get(`/parent-communications/follow-ups?${queryString({ page: 1, per_page: 500 })}`);
    return res.data?.data || [];
  };

  const setStatus = async (row, status) => {
    try {
      await put(`/parent-communications/follow-ups/item/${row.id}`, { status });
      await load();
      Swal.fire({ icon: "success", title: `Marked ${status}`, timer: 1300, showConfirmButton: false });
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not update the follow-up.", "error");
    }
  };

  if (!canFollowUp) return <Navigate to="/403" replace />;

  return (
    <div className="px-4 py-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Follow-ups</h1>
          <p className="text-xs mt-0.5" style={{ color: MUTED }}>
            Everything promised to a parent. A promise not kept is worse than one never made.
          </p>
        </div>
        <ListExportActions getRows={fetchAll} columns={COLUMNS} title="Parent Communication Follow-ups" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STAT_CARDS.map((c) => (
          <button key={c.key} type="button"
            onClick={() => {
              setPage(1);
              setFilters((f) => c.key === "overdue"
                ? { ...f, status: "pending", overdue: true }
                : { ...f, status: c.key, overdue: false });
            }}
            className={`text-left px-5 py-4 rounded-2xl border transition-colors ${
              c.filled ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-teal-100 hover:bg-teal-50"
            }`}>
            <div className={`text-xl font-bold ${c.filled ? "text-white" : "text-gray-800"}`}>
              {stats[c.key] ?? 0}
            </div>
            <div className={`text-[11px] font-semibold ${c.filled ? "text-white/80" : "text-gray-500"}`}>
              {c.label}
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-2xl p-4 flex flex-col sm:flex-row gap-3" style={{ borderColor: BORDER }}>
        <input
          className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          placeholder="Search action, family, subject…"
          value={filters.search}
          onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, search: e.target.value })); }}
        />
        <select
          className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          value={filters.overdue ? "overdue" : filters.status || "all"}
          onChange={(e) => {
            const v = e.target.value;
            setPage(1);
            setFilters((f) => v === "overdue"
              ? { ...f, status: "pending", overdue: true }
              : { ...f, status: v === "all" ? "" : v, overdue: false });
          }}>
          <option value="all">All follow-ups</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue only</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: BORDER }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-teal-50">
                {["Follow-up", "Family / student", "From", "Due", "Owner", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wide"
                    style={{ color: TEAL }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm" style={{ color: MUTED }}>Loading…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm" style={{ color: MUTED }}>
                  Nothing here — no follow-up matches this filter.
                </td></tr>
              )}
              {!loading && rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-gray-50" style={{ borderColor: "#EEF4F4" }}>
                  <td className="px-4 py-3 max-w-[280px]">
                    <bdi dir="auto" className="block font-semibold">{r.action}</bdi>
                    {r.notes && <bdi dir="auto" className="block text-[11px] mt-0.5" style={{ color: MUTED }}>{r.notes}</bdi>}
                  </td>
                  <td className="px-4 py-3">
                    <bdi dir="auto" className="block">{familyLabel(r.communication?.family)}</bdi>
                    {r.communication?.student && (
                      <bdi dir="auto" className="block text-[11px]" style={{ color: MUTED }}>
                        {studentLabel(r.communication.student)}
                      </bdi>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    {r.communication?.id ? (
                      <Link to={`/parent-communications/show/${r.communication.id}`}
                        className="underline text-[12px]" style={{ color: TEAL }}>
                        <bdi dir="auto">{r.communication.subject}</bdi>
                      </Link>
                    ) : "—"}
                    <div className="text-[10px]" style={{ color: MUTED }}>
                      {fmtDate(r.communication?.contacted_at)} · {labelOf(METHODS, r.communication?.method)}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={isOverdue(r) ? "font-bold text-rose-600" : ""}>{fmtDate(r.due_date)}</span>
                  </td>
                  <td className="px-4 py-3 text-[12px]">{r.assignee?.name || "Unassigned"}</td>
                  <td className="px-4 py-3"><Pill map={FOLLOW_UP_STATUS} value={r.status} /></td>
                  <td className="px-4 py-3">
                    {canFollowUp && r.status === "pending" && (
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => setStatus(r, "completed")}
                          className="px-2.5 py-1.5 text-[10px] font-semibold rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                          Complete
                        </button>
                        <button onClick={() => setStatus(r, "cancelled")}
                          className="px-2.5 py-1.5 text-[10px] font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                          Cancel
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {meta.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: "#EEF4F4" }}>
            <span className="text-[11px]" style={{ color: MUTED }}>
              Page {meta.current_page} of {meta.last_page} · {meta.total} follow-up(s)
            </span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 disabled:opacity-40">
                Previous
              </button>
              <button disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
