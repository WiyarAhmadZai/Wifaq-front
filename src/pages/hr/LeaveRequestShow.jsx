import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get, del } from "../../api/axios";
import Swal from "sweetalert2";

const statusConf = {
  pending: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500", label: "Pending" },
  approved: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500", label: "Approved" },
  rejected: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-500", label: "Rejected" },
};

const leaveTypeConf = {
  sick: { color: "red", label: "Sick Leave" },
  casual: { color: "blue", label: "Casual Leave" },
  annual: { color: "teal", label: "Annual Leave" },
  emergency: { color: "orange", label: "Emergency Leave" },
  maternity: { color: "pink", label: "Maternity Leave" },
  unpaid: { color: "gray", label: "Unpaid Leave" },
  other: { color: "purple", label: "Other Leave" },
};

export default function LeaveRequestShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get(`/hr/leave-requests/${id}`)
      .then((res) => setData(res.data?.data || res.data))
      .catch(() => Swal.fire("Error", "Failed to load leave request", "error"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    const r = await Swal.fire({ title: "Delete this leave request?", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Delete" });
    if (r.isConfirmed) {
      try { await del(`/hr/leave-requests/${id}`); } catch {}
      Swal.fire("Deleted!", "", "success");
      navigate("/hr/leave-request");
    }
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-100 border-t-teal-600"></div></div>;
  if (!data) return <div className="text-center py-12 text-xs text-gray-500">Leave request not found</div>;

  const staff = data.staff || {};
  const staffName = staff.application?.full_name || staff.full_name || "-";
  const staffEmpId = staff.employee_id || "-";
  const staffDept = staff.department || "-";
  const staffPosition = staff.role_title_en || "-";
  const initials = staffName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const sc = statusConf[data.status] || statusConf.pending;
  const ltc = leaveTypeConf[data.leave_type] || { color: "gray", label: data.leave_type };

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/hr/leave-request")}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-sm font-bold text-white">Leave Request Details</h1>
              <p className="text-xs text-teal-100 mt-0.5">#{String(data.id).padStart(4, "0")}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate(`/hr/leave-request/edit/${id}`)}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-medium flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
            <button onClick={handleDelete}
              className="px-3 py-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-xl text-xs font-medium flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Status Banner */}
        <div className={`${sc.bg} border ${sc.border} rounded-2xl p-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 ${sc.dot} rounded-full`} />
            <div>
              <p className={`text-sm font-bold ${sc.text}`}>{sc.label}</p>
              <p className="text-[10px] text-gray-500">Current request status</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${sc.border} ${sc.text} ${sc.bg} capitalize`}>
            {data.leave_type?.replace(/_/g, " ")} &middot; {data.total_days} day{data.total_days > 1 ? "s" : ""}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Staff Info */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Staff Member</h3>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-teal-600 flex items-center justify-center text-white text-lg font-bold">
                  {initials}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
                  <div>
                    <p className="text-[9px] font-semibold text-teal-600 uppercase tracking-wider">Employee ID</p>
                    <p className="text-xs font-bold text-gray-800">{staffEmpId}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold text-teal-600 uppercase tracking-wider">Name</p>
                    <p className="text-xs font-bold text-gray-800">{staffName}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold text-teal-600 uppercase tracking-wider">Position</p>
                    <p className="text-xs font-bold text-gray-800">{staffPosition}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold text-teal-600 uppercase tracking-wider">Department</p>
                    <p className="text-xs font-bold text-gray-800">{staffDept}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Leave Details */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Leave Details</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[9px] text-gray-500 uppercase">Type</p>
                  <p className="text-xs font-bold text-gray-800 capitalize mt-0.5">{ltc.label}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[9px] text-gray-500 uppercase">From</p>
                  <p className="text-xs font-bold text-gray-800 mt-0.5">{data.from_date ? new Date(data.from_date).toLocaleDateString() : "-"}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[9px] text-gray-500 uppercase">To</p>
                  <p className="text-xs font-bold text-gray-800 mt-0.5">{data.to_date ? new Date(data.to_date).toLocaleDateString() : "-"}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[9px] text-gray-500 uppercase">Total Days</p>
                  <p className="text-lg font-bold text-teal-700 mt-0.5">{data.total_days}</p>
                </div>
              </div>
            </div>

            {/* Reason */}
            {data.reason && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Reason</h3>
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{data.reason}</p>
              </div>
            )}

            {/* Coverage Plan */}
            {data.coverage_plan && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Coverage Plan</h3>
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{data.coverage_plan}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Record Info */}
            <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-5 text-white">
              <h3 className="text-xs font-bold mb-3">Record Info</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-teal-200">Request ID</span><span className="font-medium">#{String(data.id).padStart(4, "0")}</span></div>
                <div className="flex justify-between"><span className="text-teal-200">Status</span><span className="font-medium capitalize">{data.status}</span></div>
                <div className="flex justify-between"><span className="text-teal-200">Created</span><span className="font-medium">{data.created_at ? new Date(data.created_at).toLocaleDateString() : "-"}</span></div>
                <div className="flex justify-between"><span className="text-teal-200">Updated</span><span className="font-medium">{data.updated_at ? new Date(data.updated_at).toLocaleDateString() : "-"}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
