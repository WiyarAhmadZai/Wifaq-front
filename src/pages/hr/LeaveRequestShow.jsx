import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { get, post, put, del } from "../../api/axios";
import Swal from "sweetalert2";
import { useAuth } from "../../admin/context/AuthContext";
import LeaveRejectModal from "../../components/hr/LeaveRejectModal";
import { useNotificationHighlight } from "../../hooks/useNotificationHighlight";

import { fmtDate, fmtDateTime } from "../../utils/formErrors";

const HR_ROLES = ["super-admin", "admin", "hr-manager"];

const statusConf = {
  pending: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500", label: "Pending" },
  approved: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500", label: "Approved" },
  rejected: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-500", label: "Rejected" },
};

const leaveTypeLabel = {
  sick: "Sick Leave", casual: "Casual Leave", annual: "Annual Leave",
  emergency: "Emergency Leave", maternity: "Maternity Leave",
  unpaid: "Unpaid Leave", other: "Other Leave",
};

function daysBetween(fromIso, toIso) {
  if (!fromIso) return 0;
  const from = new Date(fromIso);
  const to = toIso ? new Date(toIso) : from;
  return Math.floor((to - from) / (1000 * 60 * 60 * 24)) + 1;
}

export default function LeaveRequestShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasRole, hasPermission } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rejectOpen, setRejectOpen] = useState(false);
  // Inline approve-and-announce modal state.
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [announceUsers, setAnnounceUsers] = useState([]);
  const [announcePicked, setAnnouncePicked] = useState([]);
  const [announceSearch, setAnnounceSearch] = useState("");
  const [announceMessage, setAnnounceMessage] = useState("");
  const [announceSending, setAnnounceSending] = useState(false);

  // "Can manage" — HR roles OR the explicit approve/manage permission.
  // Same gate the backend uses, so any user the admin grants the permission
  // to gets the Notify-Team / Approve / Reject controls automatically.
  const isHr = HR_ROLES.some((r) => hasRole(r))
    || hasPermission("leave-request.approve")
    || hasPermission("leave-request.manage");

  // When the user arrives via a notification, pulse the status banner so they
  // immediately see why they were brought here.
  const { ref: bannerRef, classes: bannerHighlight, arrived } = useNotificationHighlight();

  useEffect(() => { load(); }, [id]);

  // Auto-open the team-picker when the admin arrived from the list-page
  // Approve icon (URL carries ?action=approve). We wait until the row is
  // loaded so the modal can show the staff name + dates correctly. Strip
  // the param afterwards so a refresh doesn't re-open the modal.
  useEffect(() => {
    if (loading || !data) return;
    if (searchParams.get("action") !== "approve") return;
    if (data.status === "approved") {
      // Already approved — surface the picker without re-approving.
      openAnnounce();
    } else {
      approve();
    }
    setSearchParams((sp) => {
      const next = new URLSearchParams(sp);
      next.delete("action");
      return next;
    }, { replace: true });
  }, [loading, data, searchParams]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await get(`/hr/leave-requests/${id}`);
      setData(res.data?.data || res.data);
    } catch {
      Swal.fire("Error", "Failed to load leave request", "error");
    } finally { setLoading(false); }
  };

  // Background refetch — does NOT flip the loading spinner, so any open
  // modal (announce picker) stays mounted while the row refreshes.
  const refresh = async () => {
    try {
      const res = await get(`/hr/leave-requests/${id}`);
      setData(res.data?.data || res.data);
    } catch {/* swallow — keep existing state */}
  };

  // Approve button just OPENS the inline team-picker modal. Submit handles
  // the actual PUT /status (if not yet approved) and POST /announce in one
  // click — no confirmation Swal in the flow.
  const openAnnounce = () => {
    setAnnouncePicked([]);
    setAnnounceSearch("");
    setAnnounceMessage("");
    setAnnounceUsers([]);
    setAnnounceOpen(true);
  };
  const approve = openAnnounce;

  // Load staff every time the modal opens.
  useEffect(() => {
    if (!announceOpen) return;
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
  }, [announceOpen]);

  const filteredAnnounceUsers = (() => {
    const q = announceSearch.trim().toLowerCase();
    if (!q) return announceUsers;
    return announceUsers.filter((u) =>
      [u.name, u.employee_id, u.department].some((v) => (v || "").toLowerCase().includes(q))
    );
  })();

  const toggleAnnounceOne = (uid) =>
    setAnnouncePicked((prev) => (prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]));

  const toggleAnnounceAll = () => {
    const ids = filteredAnnounceUsers.map((u) => u.id);
    const allPicked = ids.length > 0 && ids.every((x) => announcePicked.includes(x));
    if (allPicked) {
      setAnnouncePicked((prev) => prev.filter((x) => !ids.includes(x)));
    } else {
      setAnnouncePicked((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  // Two-stage submit. No success Swal — the modal closes and the row
  // refreshes; that's the visible confirmation.
  const submitAnnounce = async () => {
    setAnnounceSending(true);
    try {
      if (data?.status !== "approved") {
        await put(`/hr/leave-requests/${id}/status`, { status: "approved" });
      }
      if (announcePicked.length > 0) {
        await post(`/hr/leave-requests/${id}/announce`, {
          user_ids: announcePicked,
          message: announceMessage.trim() || undefined,
        });
      }
      window.dispatchEvent(new CustomEvent("wen:notifications-refresh"));
      setAnnounceOpen(false);
      refresh();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed", "error");
    } finally {
      setAnnounceSending(false);
    }
  };

  const reject = async (reason) => {
    try {
      await put(`/hr/leave-requests/${id}/status`, { status: "rejected", rejection_reason: reason });
      Swal.fire({ icon: "success", title: "Rejected", timer: 1200, showConfirmButton: false });
      setRejectOpen(false);
      load();
      window.dispatchEvent(new CustomEvent("wen:notifications-refresh"));
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed", "error");
    }
  };

  const handleDelete = async () => {
    const r = await Swal.fire({ title: "Delete this leave request?", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444" });
    if (!r.isConfirmed) return;
    try { await del(`/hr/leave-requests/${id}`); } catch {}
    Swal.fire({ icon: "success", title: "Deleted", timer: 1000, showConfirmButton: false });
    navigate("/hr/leave-request");
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-100 border-t-teal-600" /></div>;
  if (!data) return <div className="text-center py-12 text-xs text-gray-500">Leave request not found</div>;

  const staff = data.staff || {};
  const staffName = staff.application?.full_name || staff.full_name || "-";
  const staffEmpId = staff.employee_id || "-";
  const staffDept = staff.department || "-";
  const staffPosition = staff.role_title_en || "-";
  const initials = staffName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const sc = statusConf[data.status] || statusConf.pending;
  const totalDays = daysBetween(data.from_date, data.to_date);
  // HR can move requests between states freely:
  //   pending  → Approve + Reject
  //   approved → Reject (revoke approval)
  //   rejected → Approve (overturn rejection)
  const canApprove = isHr && (data.status === "pending" || data.status === "rejected");
  const canReject = isHr && (data.status === "pending" || data.status === "approved");

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="bg-teal-600 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h1 className="text-sm font-bold text-white">Leave Request Details</h1>
              <p className="text-xs text-teal-100 mt-0.5">#{String(data.id).padStart(4, "0")}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {canApprove && (
              <button onClick={approve}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
                title={data.status === "rejected" ? "Overturn rejection — re-approve" : "Approve"}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                {data.status === "rejected" ? "Re-approve" : "Approve"}
              </button>
            )}
            {canReject && (
              <button onClick={() => setRejectOpen(true)}
                className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
                title={data.status === "approved" ? "Revoke approval — reject" : "Reject"}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                {data.status === "approved" ? "Revoke" : "Reject"}
              </button>
            )}
            {isHr && data.status === "approved" && (
              <button onClick={openAnnounce}
                className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
                title="Open the picker again to notify more colleagues">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                Notify Team
              </button>
            )}
            {isHr && (
              <button onClick={handleDelete}
                className="p-2 bg-white/20 hover:bg-red-500/80 text-white rounded-xl transition-colors" title="Delete">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Status banner */}
        <div ref={bannerRef}
          className={`${sc.bg} border ${sc.border} rounded-2xl p-4 flex items-center justify-between ${bannerHighlight}`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 ${sc.dot} rounded-full`} />
            <div>
              <p className={`text-sm font-bold ${sc.text}`}>{sc.label}</p>
              <p className="text-[10px] text-gray-500">
                {data.reviewed_at
                  ? `Decided by ${data.reviewer?.name || "—"} on ${fmtDateTime(data.reviewed_at)}`
                  : "Waiting for HR review"}
                {arrived && <span className="ml-2 text-teal-600 font-semibold">· opened from notification</span>}
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${sc.border} ${sc.text} ${sc.bg} capitalize`}>
            {leaveTypeLabel[data.leave_type] || data.leave_type} · {totalDays} day{totalDays === 1 ? "" : "s"}
          </span>
        </div>

        {/* Rejection reason banner — visible only when rejected */}
        {data.status === "rejected" && data.rejection_reason && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-700 mb-1">Reason for rejection</p>
              <p className="text-sm text-red-900 leading-relaxed whitespace-pre-wrap">{data.rejection_reason}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Staff Info */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Staff Member</h3>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-teal-600 flex items-center justify-center text-white text-lg font-bold">{initials}</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
                  <Field label="Employee ID" value={staffEmpId} />
                  <Field label="Name" value={staffName} />
                  <Field label="Position" value={staffPosition} />
                  <Field label="Department" value={staffDept} />
                </div>
              </div>
            </div>

            {/* Leave Details */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Leave Details</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Cell label="Type" value={leaveTypeLabel[data.leave_type] || data.leave_type} />
                <Cell label="From" value={data.from_date ? fmtDate(data.from_date) : "-"} />
                <Cell label="To" value={data.to_date ? fmtDate(data.to_date) : "-"} />
                <Cell label="Total Days" value={totalDays} accent />
              </div>
            </div>

            {data.reason && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Reason</h3>
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{data.reason}</p>
              </div>
            )}

            {data.coverage_plan && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Coverage Plan</h3>
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{data.coverage_plan}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-5 text-white">
              <h3 className="text-xs font-bold mb-3">Record Info</h3>
              <div className="space-y-2 text-xs">
                <Row k="Request ID" v={`#${String(data.id).padStart(4, "0")}`} />
                <Row k="Status" v={sc.label} />
                <Row k="Submitted" v={data.created_at ? fmtDate(data.created_at) : "-"} />
                {data.reviewed_at && <Row k="Reviewed" v={fmtDate(data.reviewed_at)} />}
                {data.reviewer?.name && <Row k="Reviewer" v={data.reviewer.name} />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {rejectOpen && (
        <LeaveRejectModal
          staffName={staffName}
          onClose={() => setRejectOpen(false)}
          onConfirm={reject}
        />
      )}

      {/* ── Inline approve-and-announce modal ── */}
      {announceOpen && data && (() => {
        const isApproved = data.status === "approved";
        const rangeText = data.from_date
          ? (data.to_date && data.to_date !== data.from_date
              ? `${fmtDate(data.from_date)} → ${fmtDate(data.to_date)}`
              : fmtDate(data.from_date))
          : "-";
        return (
          // Backdrop click is intentionally a no-op — close only via X /
          // Cancel / successful submit, so a stray click can't drop the
          // pick state mid-flow.
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
                  onClick={() => !announceSending && setAnnounceOpen(false)}
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
                  onClick={toggleAnnounceAll}
                  className="px-3 py-2 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-xl hover:bg-indigo-50 whitespace-nowrap"
                >
                  {filteredAnnounceUsers.length > 0 && filteredAnnounceUsers.every((u) => announcePicked.includes(u.id))
                    ? "Unselect all"
                    : "Select all"}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                {announceUsers.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-8">Loading staff…</p>
                ) : filteredAnnounceUsers.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-8">No staff match your search</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredAnnounceUsers.map((u) => {
                      const picked = announcePicked.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => toggleAnnounceOne(u.id)}
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
                    onClick={() => setAnnounceOpen(false)}
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
        );
      })()}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[9px] font-semibold text-teal-600 uppercase tracking-wider">{label}</p>
      <p className="text-xs font-bold text-gray-800">{value}</p>
    </div>
  );
}

function Cell({ label, value, accent }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-[9px] text-gray-500 uppercase">{label}</p>
      <p className={`${accent ? "text-lg font-bold text-teal-700" : "text-xs font-bold text-gray-800 capitalize"} mt-0.5`}>{value}</p>
    </div>
  );
}

function Row({ k, v }) {
  return <div className="flex justify-between"><span className="text-teal-200">{k}</span><span className="font-medium">{v}</span></div>;
}

