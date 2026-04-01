import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get, del } from "../../api/axios";
import Swal from "sweetalert2";

const statusConf = {
  scheduled: { label: "Scheduled", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-500" },
  in_progress: { label: "In Progress", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
  completed: { label: "Completed", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  cancelled: { label: "Cancelled", bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-500" },
};

export default function MeetingShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get(`/meetings/${id}`).then((r) => setData(r.data?.data || r.data)).catch(() => Swal.fire("Error", "Failed to load", "error")).finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    const r = await Swal.fire({ title: "Delete meeting?", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Delete" });
    if (r.isConfirmed) { try { await del(`/meetings/${id}`); } catch {} navigate("/hr/meetings"); }
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-100 border-t-teal-600"></div></div>;
  if (!data) return <div className="text-center py-24 text-sm text-gray-400">Meeting not found</div>;

  const sc = statusConf[data.status] || statusConf.scheduled;
  const formatDT = (dt) => dt ? new Date(dt).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";
  const getDuration = () => {
    if (!data.start_time || !data.end_time) return "-";
    const diff = (new Date(data.end_time) - new Date(data.start_time)) / 60000;
    const h = Math.floor(diff / 60), m = Math.round(diff % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };
  const totalAgendaMin = (data.agenda_items || []).reduce((s, a) => s + (a.duration_min || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-5">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/hr/meetings")} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-bold text-white">Meeting Details</h1>
            <p className="text-xs text-teal-100 mt-0.5">#{String(data.id).padStart(4, "0")}</p>
          </div>
          <button onClick={() => navigate(`/hr/meetings/edit/${id}`)} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl">Edit</button>
          <button onClick={handleDelete} className="px-3 py-1.5 bg-red-500/80 hover:bg-red-500 text-white text-xs font-semibold rounded-xl">Delete</button>
        </div>
        <h2 className="text-lg font-black text-white">{data.title}</h2>
        <div className="flex items-center gap-2 mt-2">
          <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>{sc.label}
          </span>
          <span className="px-2.5 py-0.5 bg-white/20 text-white text-[11px] font-semibold rounded-full">{getDuration()}</span>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Time & Location */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase">Start</p>
            <p className="text-xs font-bold text-gray-800 mt-1">{formatDT(data.start_time)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase">End</p>
            <p className="text-xs font-bold text-gray-800 mt-1">{formatDT(data.end_time)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase">Location</p>
            <p className="text-xs font-bold text-gray-800 mt-1">{data.location || "-"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Description */}
            {data.description && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Description</h3>
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{data.description}</p>
              </div>
            )}

            {/* Agenda */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-5 py-3 bg-teal-50 border-b border-teal-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-teal-600 rounded-lg flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                  </div>
                  <p className="text-sm font-bold text-gray-800">Agenda</p>
                </div>
                {totalAgendaMin > 0 && <span className="text-[10px] font-semibold text-teal-600">{totalAgendaMin} min total</span>}
              </div>
              <div className="p-5">
                {(data.agenda_items || []).length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No agenda items</p>
                ) : (
                  <div className="space-y-3">
                    {data.agenda_items.map((a, i) => (
                      <div key={a.id || i} className="flex gap-3">
                        <div className="w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <p className="text-xs font-semibold text-gray-800">{a.title}</p>
                            {a.duration_min > 0 && <span className="text-[10px] text-gray-400 flex-shrink-0">{a.duration_min} min</span>}
                          </div>
                          {a.description && <p className="text-[10px] text-gray-500 mt-0.5">{a.description}</p>}
                          {a.assigned_to && <p className="text-[10px] text-teal-600 mt-0.5 font-medium">Presenter: {a.assigned_to.name}</p>}
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
            {/* Participants */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Participants ({(data.participants || []).length})</h3>
              </div>
              <div className="p-3">
                {(data.participants || []).length === 0 ? (
                  <p className="text-xs text-gray-400 italic px-2 py-2">No participants</p>
                ) : (
                  <div className="space-y-1">
                    {data.participants.map((p) => (
                      <div key={p.id} className="flex items-center gap-2.5 px-2 py-2 hover:bg-gray-50 rounded-lg">
                        <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          {(p.name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-gray-800 truncate">{p.name}</p>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold capitalize ${
                          p.pivot?.status === "accepted" ? "bg-emerald-100 text-emerald-700"
                          : p.pivot?.status === "declined" ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-600"
                        }`}>{p.pivot?.status || "invited"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Organizer & Info */}
            <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-5 text-white">
              <h3 className="text-xs font-bold mb-3">Meeting Info</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-teal-200">Organizer</span><span className="font-medium">{data.organizer?.name || "-"}</span></div>
                <div className="flex justify-between"><span className="text-teal-200">Duration</span><span className="font-medium">{getDuration()}</span></div>
                <div className="flex justify-between"><span className="text-teal-200">Created</span><span className="font-medium">{data.created_at ? new Date(data.created_at).toLocaleDateString() : "-"}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
