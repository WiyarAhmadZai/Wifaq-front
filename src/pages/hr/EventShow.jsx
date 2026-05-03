import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get, put, del } from "../../api/axios";
import Swal from "sweetalert2";
import { useResourcePermissions } from "../../admin/utils/useResourcePermissions";

const statusConf = {
  upcoming: { label: "Upcoming", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-500" },
  ongoing: { label: "Ongoing", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
  completed: { label: "Completed", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  cancelled: { label: "Cancelled", bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-500" },
};

export default function EventShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canUpdate, canDelete } = useResourcePermissions("events");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const statusRef = useRef(null);

  useEffect(() => {
    get(`/events/${id}`).then((r) => setData(r.data?.data || r.data)).catch(() => Swal.fire("Error", "Failed to load", "error")).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const close = (e) => { if (statusRef.current && !statusRef.current.contains(e.target)) setShowStatusMenu(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const changeStatus = async (newStatus) => {
    try {
      await put(`/events/${id}`, { status: newStatus });
      setData((p) => ({ ...p, status: newStatus }));
      setShowStatusMenu(false);
      Swal.fire({ icon: "success", title: `Status changed to ${newStatus}`, timer: 1500, showConfirmButton: false });
    } catch { Swal.fire("Error", "Failed to update status", "error"); }
  };

  const handleDelete = async () => {
    const r = await Swal.fire({ title: "Delete event?", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Delete" });
    if (r.isConfirmed) { try { await del(`/events/${id}`); } catch {} navigate("/hr/events"); }
  };

  const toggleReq = async (reqId) => {
    try {
      const res = await put(`/events/requirements/${reqId}/toggle`);
      setData((p) => ({
        ...p,
        requirements: p.requirements.map((r) => r.id === reqId ? { ...r, is_completed: !r.is_completed } : r),
      }));
    } catch { Swal.fire("Error", "Failed to update", "error"); }
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-100 border-t-teal-600"></div></div>;
  if (!data) return <div className="text-center py-24 text-sm text-gray-400">Event not found</div>;

  const sc = statusConf[data.status] || statusConf.upcoming;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "-";
  const isMultiDay = data.end_date && data.start_date !== data.end_date;
  const roles = data.roles || [];
  const reqs = data.requirements || [];
  const doneCount = reqs.filter((r) => r.is_completed).length;
  const progress = reqs.length > 0 ? Math.round((doneCount / reqs.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-5">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/hr/events")} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex-1"><h1 className="text-sm font-bold text-white">Event Details</h1></div>
          {canUpdate && (
            <button onClick={() => navigate(`/hr/events/edit/${id}`)} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl">Edit</button>
          )}
          {canDelete && (
            <button onClick={handleDelete} className="px-3 py-1.5 bg-red-500/80 hover:bg-red-500 text-white text-xs font-semibold rounded-xl">Delete</button>
          )}
        </div>
        <h2 className="text-lg font-black text-white">{data.title}</h2>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <div className="relative" ref={statusRef}>
            <button onClick={() => setShowStatusMenu(!showStatusMenu)}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border cursor-pointer hover:opacity-80 transition-opacity ${sc.bg} ${sc.text} ${sc.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
              {sc.label}
              <svg className={`w-3 h-3 transition-transform ${showStatusMenu ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showStatusMenu && (
              <div className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 min-w-[150px]">
                {Object.entries(statusConf).map(([key, conf]) => (
                  <button key={key} onClick={() => changeStatus(key)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${data.status === key ? "font-bold" : ""}`}>
                    <span className={`w-2 h-2 rounded-full ${conf.dot}`}></span>
                    <span className={`${conf.text}`}>{conf.label}</span>
                    {data.status === key && (
                      <svg className="w-3 h-3 ml-auto text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="px-2.5 py-0.5 bg-white/20 text-white text-[11px] font-semibold rounded-full">
            {formatDate(data.start_date)}{isMultiDay ? ` - ${formatDate(data.end_date)}` : ""}
          </span>
          {data.location && (
            <span className="px-2.5 py-0.5 bg-white/20 text-white text-[11px] font-semibold rounded-full flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
              {data.location}
            </span>
          )}
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Description */}
            {data.description && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Description</h3>
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{data.description}</p>
              </div>
            )}

            {/* Team Roles */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-5 py-3 bg-purple-50 border-b border-purple-100 flex items-center gap-2.5">
                <div className="w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <p className="text-sm font-bold text-gray-800">Team Roles ({roles.length})</p>
              </div>
              <div className="p-5">
                {roles.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No roles assigned</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {roles.map((role, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          {(role.user?.name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{role.user?.name || "Unknown"}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[9px] font-semibold rounded-full">{role.role_name}</span>
                            {role.notes && <span className="text-[9px] text-gray-400 truncate">{role.notes}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Requirements Checklist */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">Requirements</p>
                    <p className="text-[10px] text-amber-600">{doneCount}/{reqs.length} completed</p>
                  </div>
                </div>
                {reqs.length > 0 && (
                  <span className={`text-xs font-bold ${progress === 100 ? "text-emerald-600" : "text-amber-600"}`}>{progress}%</span>
                )}
              </div>
              <div className="p-5">
                {/* Progress bar */}
                {reqs.length > 0 && (
                  <div className="mb-4">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${progress === 100 ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}

                {reqs.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No requirements</p>
                ) : (
                  <div className="space-y-2">
                    {reqs.map((req) => (
                      <div key={req.id} onClick={() => toggleReq(req.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm ${req.is_completed ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-100 hover:border-amber-200"}`}>
                        {/* Checkbox */}
                        <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${req.is_completed ? "bg-emerald-500 border-emerald-500" : "border-gray-300"}`}>
                          {req.is_completed && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`text-xs font-medium ${req.is_completed ? "text-emerald-700 line-through" : "text-gray-800"}`}>{req.description}</p>
                          {req.assigned_to && (
                            <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                              {req.assigned_to.name}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Main Responsible */}
            {data.main_responsible && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Main Responsible</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold">
                    {(data.main_responsible.name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">{data.main_responsible.name}</p>
                    <p className="text-[10px] text-gray-400">Person in charge</p>
                  </div>
                </div>
              </div>
            )}

            {/* Event Info */}
            <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-5 text-white">
              <h3 className="text-xs font-bold mb-3">Event Info</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-teal-200">Status</span><span className="font-medium capitalize">{data.status}</span></div>
                <div className="flex justify-between"><span className="text-teal-200">Start</span><span className="font-medium">{formatDate(data.start_date)}</span></div>
                {isMultiDay && <div className="flex justify-between"><span className="text-teal-200">End</span><span className="font-medium">{formatDate(data.end_date)}</span></div>}
                <div className="flex justify-between"><span className="text-teal-200">Location</span><span className="font-medium">{data.location || "-"}</span></div>
                <div className="flex justify-between"><span className="text-teal-200">Team</span><span className="font-medium">{roles.length} role{roles.length !== 1 ? "s" : ""}</span></div>
                <div className="flex justify-between"><span className="text-teal-200">Tasks</span><span className="font-medium">{doneCount}/{reqs.length} done</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
