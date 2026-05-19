import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get, put, del } from "../../api/axios";
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
  const { hasRole } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rejectOpen, setRejectOpen] = useState(false);

  const isHr = HR_ROLES.some((r) => hasRole(r));

  // When the user arrives via a notification, pulse the status banner so they
  // immediately see why they were brought here.
  const { ref: bannerRef, classes: bannerHighlight, arrived } = useNotificationHighlight();

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await get(`/hr/leave-requests/${id}`);
      setData(res.data?.data || res.data);
    } catch {
      Swal.fire("Error", "Failed to load leave request", "error");
    } finally { setLoading(false); }
  };

  const approve = async () => {
    const isOverturn = data?.status === "rejected";
    const r = await Swal.fire({
      icon: "question",
      title: isOverturn ? "Overturn the rejection and approve?" : "Approve this leave request?",
      text: isOverturn ? "The previous rejection reason will be cleared." : "",
      showCancelButton: true,
      confirmButtonColor: "#155c57",
      confirmButtonText: isOverturn ? "Yes, re-approve" : "Yes, approve",
    });
    if (!r.isConfirmed) return;
    try {
      await put(`/hr/leave-requests/${id}/status`, { status: "approved" });
      Swal.fire({ icon: "success", title: isOverturn ? "Re-approved" : "Approved", timer: 1200, showConfirmButton: false });
      load();
      window.dispatchEvent(new CustomEvent("wen:notifications-refresh"));
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed", "error");
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

