import { useState, useEffect } from "react";
import CrudPage from "../../components/CrudPage";
import LeaveRejectModal from "../../components/hr/LeaveRejectModal";
import { useAuth } from "../../admin/context/AuthContext";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";

import { fmtDate } from "../../utils/formErrors";

const HR_ROLES = ["super-admin", "admin", "hr-manager"];

const statusBadge = (val) => {
  const conf = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${conf[val] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
      {val || "-"}
    </span>
  );
};

const leaveTypeBadge = (val) => {
  const conf = {
    sick: "bg-red-50 text-red-700 border-red-200",
    casual: "bg-blue-50 text-blue-700 border-blue-200",
    annual: "bg-teal-50 text-teal-700 border-teal-200",
    emergency: "bg-orange-50 text-orange-700 border-orange-200",
    maternity: "bg-pink-50 text-pink-700 border-pink-200",
    unpaid: "bg-gray-50 text-gray-700 border-gray-200",
    other: "bg-purple-50 text-purple-700 border-purple-200",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${conf[val] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
      {val?.replace(/_/g, " ") || "-"}
    </span>
  );
};

/** Days between two dates (inclusive). */
function daysBetween(fromIso, toIso) {
  if (!fromIso) return 0;
  const from = new Date(fromIso);
  const to = toIso ? new Date(toIso) : from;
  return Math.floor((to - from) / (1000 * 60 * 60 * 24)) + 1;
}

export default function LeaveRequest() {
  const { hasRole, hasPermission } = useAuth();
  const isHr = HR_ROLES.some((r) => hasRole(r));
  // Approve/Reject buttons require the explicit permission. Strip
  // `leave-request.approve` from a user and the buttons disappear, even
  // if they're in an HR role.
  const canApprove = hasPermission("leave-request.approve") || hasPermission("leave-request.manage");
  const [rejectTarget, setRejectTarget] = useState(null); // { item, refresh }

  // ── Inline approve-and-announce modal state ─────────────────────────────
  // The picker lives in this same file. Tick → opens modal → admin selects
  // users → one click does both PUT /status AND POST /announce. No Swal
  // anywhere in the flow.
  const [announceTarget, setAnnounceTarget] = useState(null); // { item, refresh }
  const [announceUsers, setAnnounceUsers] = useState([]);
  const [announcePicked, setAnnouncePicked] = useState([]);
  const [announceSearch, setAnnounceSearch] = useState("");
  const [announceMessage, setAnnounceMessage] = useState("");
  const [announceSending, setAnnounceSending] = useState(false);

  const approve = (item, refresh) => {
    setAnnouncePicked([]);
    setAnnounceSearch("");
    setAnnounceMessage("");
    setAnnounceUsers([]);
    setAnnounceTarget({ item, refresh });
  };

  // Load the staff list every time the modal opens.
  useEffect(() => {
    if (!announceTarget) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await get(`/hr/staff/list?per_page=1000&status=active`);
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data ?? [];
        const list = (Array.isArray(raw) ? raw : [])
          .filter((s) => s.user_id)
          .map((s) => ({
            id: s.user_id,
            name: s.application?.full_name || s.full_name || `Staff #${s.employee_id || s.id}`,
            employee_id: s.employee_id || "",
            department: s.department || s.department_relation?.name || "",
          }));
        if (!cancelled) setAnnounceUsers(list);
      } catch {
        if (!cancelled) setAnnounceUsers([]);
      }
    })();
    return () => { cancelled = true; };
  }, [announceTarget]);

  const item = announceTarget?.item || null;
  const isApproved = item?.status === "approved";
  const staffName =
    item?.staff?.application?.full_name ||
    item?.staff?.full_name ||
    (item ? `Staff #${item.staff_id || ""}` : "");

  const filteredUsers = (() => {
    const q = announceSearch.trim().toLowerCase();
    if (!q) return announceUsers;
    return announceUsers.filter((u) =>
      [u.name, u.employee_id, u.department].some((v) => (v || "").toLowerCase().includes(q))
    );
  })();

  const toggleOne = (uid) =>
    setAnnouncePicked((prev) => (prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]));

  const toggleAll = () => {
    const ids = filteredUsers.map((u) => u.id);
    const allPicked = ids.length > 0 && ids.every((x) => announcePicked.includes(x));
    if (allPicked) {
      setAnnouncePicked((prev) => prev.filter((x) => !ids.includes(x)));
    } else {
      setAnnouncePicked((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  const closeAnnounce = () => setAnnounceTarget(null);

  /**
   * Two-stage submit driven by the modal's primary button.
   * Stage 1 — PUT /status to approve (only if not already approved).
   * Stage 2 — POST /announce to notify picked users (only if any picked).
   * Both are optional independently — "Approve · Notify no one" runs stage 1,
   * pressing "Notify N" on an already-approved request runs stage 2.
   *
   * No success Swal — the modal closes and the row refreshes; that's the
   * confirmation. Errors still go through Swal because they're not silent.
   */
  const submitAnnounce = async () => {
    if (!announceTarget) return;
    setAnnounceSending(true);
    try {
      if (!isApproved) {
        await put(`/hr/leave-requests/${item.id}/status`, { status: "approved" });
      }
      if (announcePicked.length > 0) {
        await post(`/hr/leave-requests/${item.id}/announce`, {
          user_ids: announcePicked,
          message: announceMessage.trim() || undefined,
        });
      }
      window.dispatchEvent(new CustomEvent("wen:notifications-refresh"));
      announceTarget.refresh?.();
      closeAnnounce();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed", "error");
    } finally {
      setAnnounceSending(false);
    }
  };

  const rejectWithReason = async (reason) => {
    if (!rejectTarget) return;
    try {
      await put(`/hr/leave-requests/${rejectTarget.item.id}/status`, {
        status: "rejected",
        rejection_reason: reason,
      });
      rejectTarget.refresh();
      setRejectTarget(null);
      window.dispatchEvent(new CustomEvent("wen:notifications-refresh"));
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed", "error");
    }
  };

  /**
   * Action buttons by current status (HR only):
   *   pending  → Approve + Reject
   *   approved → Reject (HR can change their mind)
   *   rejected → Approve (HR can change their mind)
   */
  const renderRowActions = (item, refresh) => {
    if (!canApprove) return null;
    const showApprove = item.status === "pending" || item.status === "rejected";
    const showReject = item.status === "pending" || item.status === "approved";
    return (
      <>
        {showApprove && (
          <button
            onClick={() => approve(item, refresh)}
            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            title={item.status === "rejected" ? "Re-approve (overturn rejection)" : "Approve"}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        )}
        {showReject && (
          <button
            onClick={() => setRejectTarget({ item, refresh })}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title={item.status === "approved" ? "Reject (revoke approval)" : "Reject"}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </>
    );
  };

  // Pretty date range for the modal header.
  const rangeText = (() => {
    if (!item?.from_date) return "-";
    const f = fmtDate(item.from_date);
    if (!item.to_date || item.to_date === item.from_date) return f;
    return `${f} → ${fmtDate(item.to_date)}`;
  })();

  return (
    <>
      <CrudPage
        permissionBase="leave-request"
        title={isHr ? "Leave Requests" : "My Leave Requests"}
        apiEndpoint="/hr/leave-requests"
        createRoute="/hr/leave-request/create"
        editRoute="/hr/leave-request/edit"
        showRoute="/hr/leave-request/show"
        deleteEndpoint="/hr/leave-requests"
        searchable
        searchFields={["leave_type", "reason", "coverage_plan"]}
        rowActions={renderRowActions}
        listColumns={[
          // Staff column only matters for HR; a regular user is always looking at themselves.
          ...(isHr
            ? [{
                key: "staff",
                label: "Staff",
                render: (val, item) => {
                  const name = item.staff?.application?.full_name || item.staff?.full_name || "-";
                  const empId = item.staff?.employee_id || "";
                  return (
                    <div>
                      <p className="text-xs font-medium text-gray-800">{name}</p>
                      {empId && <p className="text-[10px] text-gray-400">{empId}</p>}
                    </div>
                  );
                },
              }]
            : []),
          { key: "leave_type", label: "Type", render: leaveTypeBadge },
          {
            key: "from_date",
            label: "From",
            render: (val) => (val ? fmtDate(val) : "-"),
          },
          {
            key: "to_date",
            label: "To",
            render: (val, item) =>
              val
                ? fmtDate(val)
                : item.from_date
                ? fmtDate(item.from_date)
                : "-",
          },
          {
            key: "days",
            label: "Days",
            render: (_v, item) => <span className="font-semibold">{daysBetween(item.from_date, item.to_date)}</span>,
          },
          { key: "status", label: "Status", render: statusBadge },
        ]}
      />

      {rejectTarget && (
        <LeaveRejectModal
          staffName={rejectTarget.item.staff?.application?.full_name || rejectTarget.item.staff?.full_name}
          onClose={() => setRejectTarget(null)}
          onConfirm={rejectWithReason}
        />
      )}

      {/* ── Inline approve-and-announce modal ── */}
      {/* Backdrop click is intentionally a no-op — the modal only closes
          via the X button, Cancel, or after a successful submit. This
          prevents accidental dismissal mid-pick. */}
      {announceTarget && item && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-500 to-indigo-600 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">
                  {isApproved ? "Announce leave to team" : "Approve leave & notify team?"}
                </h3>
                <p className="text-[11px] text-white/80 mt-0.5">
                  {isApproved ? (
                    <>Pick who should be told that <b>{staffName}</b> will be away.</>
                  ) : (
                    <>
                      Tick the colleagues who should be told that <b>{staffName}</b> will be away,
                      then click <b>Approve</b>. You can also approve without notifying anyone.
                    </>
                  )}{" "}
                  ({rangeText})
                </p>
              </div>
              <button
                onClick={closeAnnounce}
                disabled={announceSending}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <input
                type="text"
                value={announceSearch}
                onChange={(e) => setAnnounceSearch(e.target.value)}
                placeholder="Search by name, employee id or department…"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-300 focus:outline-none"
              />
              <button
                onClick={toggleAll}
                className="px-3 py-2 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-xl hover:bg-indigo-50 whitespace-nowrap"
              >
                {filteredUsers.length > 0 && filteredUsers.every((u) => announcePicked.includes(u.id))
                  ? "Unselect all"
                  : "Select all"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {announceUsers.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-8">Loading staff…</p>
              ) : filteredUsers.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-8">No staff match your search</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredUsers.map((u) => {
                    const picked = announcePicked.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleOne(u.id)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl border text-left transition-colors ${picked ? "bg-indigo-50 border-indigo-300" : "bg-white border-gray-200 hover:border-indigo-200"}`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${picked ? "bg-indigo-600 border-indigo-600" : "bg-white border-gray-300"}`}>
                          {picked && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{u.name}</p>
                          <p className="text-[10px] text-gray-500 truncate">
                            {u.employee_id || ""}{u.department ? ` · ${u.department}` : ""}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-gray-100">
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Custom message (optional)
              </label>
              <textarea
                value={announceMessage}
                onChange={(e) => setAnnounceMessage(e.target.value)}
                rows={2}
                placeholder="e.g. Please direct urgent items to Ahmed during this period."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-300 focus:outline-none resize-none"
              />
            </div>

            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs text-gray-500">{announcePicked.length} selected</span>
              <div className="flex gap-2">
                <button
                  onClick={closeAnnounce}
                  disabled={announceSending}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                {!isApproved && (
                  <button
                    onClick={() => { setAnnouncePicked([]); submitAnnounce(); }}
                    disabled={announceSending}
                    className="px-4 py-2 text-xs font-semibold text-emerald-700 bg-white border border-emerald-200 rounded-xl hover:bg-emerald-50 disabled:opacity-50"
                  >
                    Approve · Notify no one
                  </button>
                )}
                <button
                  onClick={submitAnnounce}
                  disabled={announceSending || (isApproved && announcePicked.length === 0)}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50 flex items-center gap-2"
                >
                  {announceSending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Working…
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {isApproved
                        ? `Notify ${announcePicked.length || ""}`
                        : announcePicked.length > 0
                          ? `Approve & notify ${announcePicked.length}`
                          : "Approve"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
