import { useState } from "react";
import CrudPage from "../../components/CrudPage";
import LeaveRejectModal from "../../components/hr/LeaveRejectModal";
import { useAuth } from "../../admin/context/AuthContext";
import { put } from "../../api/axios";
import Swal from "sweetalert2";

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
  const { hasRole } = useAuth();
  const isHr = HR_ROLES.some((r) => hasRole(r));
  const [rejectTarget, setRejectTarget] = useState(null); // { item, refresh }

  const approve = async (item, refresh) => {
    const isOverturn = item.status === "rejected";
    const name = item.staff?.application?.full_name || item.staff?.full_name || "";
    const r = await Swal.fire({
      icon: "question",
      title: isOverturn ? "Overturn the rejection and approve?" : "Approve this leave request?",
      text: isOverturn
        ? `The previous rejection reason will be cleared.${name ? " For " + name : ""}`
        : (name ? `For ${name}` : ""),
      showCancelButton: true,
      confirmButtonColor: "#155c57",
      confirmButtonText: isOverturn ? "Yes, re-approve" : "Yes, approve",
    });
    if (!r.isConfirmed) return;
    try {
      await put(`/hr/leave-requests/${item.id}/status`, { status: "approved" });
      Swal.fire({ icon: "success", title: isOverturn ? "Re-approved" : "Approved", timer: 1000, showConfirmButton: false });
      refresh();
      // Tell the bell to refresh immediately — the requester just received a notification.
      window.dispatchEvent(new CustomEvent("wen:notifications-refresh"));
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed", "error");
    }
  };

  const rejectWithReason = async (reason) => {
    if (!rejectTarget) return;
    try {
      await put(`/hr/leave-requests/${rejectTarget.item.id}/status`, {
        status: "rejected",
        rejection_reason: reason,
      });
      Swal.fire({ icon: "success", title: "Rejected", timer: 1000, showConfirmButton: false });
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
    if (!isHr) return null;
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

  return (
    <>
      <CrudPage
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
            render: (val) => (val ? new Date(val).toLocaleDateString() : "-"),
          },
          {
            key: "to_date",
            label: "To",
            render: (val, item) =>
              val
                ? new Date(val).toLocaleDateString()
                : item.from_date
                ? new Date(item.from_date).toLocaleDateString()
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
    </>
  );
}
