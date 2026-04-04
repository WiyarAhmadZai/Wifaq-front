import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get, del } from "../../api/axios";
import Swal from "sweetalert2";

const statusConf = {
  scheduled: { label: "Scheduled", color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  in_progress: { label: "In Progress", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  completed: { label: "Completed", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  cancelled: { label: "Cancelled", color: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
};

export default function Meetings() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await get("/meetings");
      const data = res.data?.data || res.data || [];
      setItems(Array.isArray(data) ? data : []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    const r = await Swal.fire({ title: "Delete meeting?", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Delete" });
    if (r.isConfirmed) {
      try { await del(`/meetings/${id}`); } catch {}
      setItems((p) => p.filter((i) => i.id !== id));
      Swal.fire({ icon: "success", title: "Deleted!", timer: 1500, showConfirmButton: false });
    }
  };

  let filtered = items;
  if (filter !== "all") filtered = filtered.filter((i) => i.status === filter);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((i) => (i.title || "").toLowerCase().includes(q) || (i.location || "").toLowerCase().includes(q));
  }

  const formatDT = (dt) => {
    if (!dt) return "-";
    const d = new Date(dt);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " · " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const upcoming = items.filter((i) => i.status === "scheduled" && new Date(i.start_time) > new Date()).length;

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="bg-teal-600 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-white">Meetings</h1>
            <p className="text-xs text-teal-100 mt-0.5">{items.length} total · {upcoming} upcoming</p>
          </div>
          <button onClick={() => navigate("/hr/meetings/create")}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Meeting
          </button>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search meetings..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white" />
          </div>
          <div className="flex gap-1">
            {["all", "scheduled", "in_progress", "completed", "cancelled"].map((s) => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-2 rounded-xl text-[10px] font-semibold capitalize transition-colors ${filter === s ? "bg-teal-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-teal-300"}`}>
                {s === "all" ? "All" : s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Meeting cards */}
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <svg className="w-12 h-12 mx-auto text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <p className="text-sm text-gray-400 font-medium">No meetings found</p>
            <button onClick={() => navigate("/hr/meetings/create")} className="mt-3 text-xs font-semibold text-teal-600 hover:text-teal-700">Schedule one</button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((m) => {
              const sc = statusConf[m.status] || statusConf.scheduled;
              const participantCount = m.participants?.length || 0;
              const agendaCount = m.agenda_items?.length || 0;
              const isPast = new Date(m.end_time) < new Date();

              return (
                <div key={m.id} onClick={() => navigate(`/hr/meetings/show/${m.id}`)}
                  className={`bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer ${isPast && m.status === "scheduled" ? "opacity-70" : ""}`}>
                  <div className="p-4 flex items-start gap-4">
                    {/* Date block */}
                    <div className="w-14 h-14 bg-teal-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border border-teal-100">
                      <span className="text-[9px] font-bold text-teal-600 uppercase">{m.start_time ? new Date(m.start_time).toLocaleDateString("en-US", { month: "short" }) : ""}</span>
                      <span className="text-lg font-black text-teal-700 -mt-0.5">{m.start_time ? new Date(m.start_time).getDate() : ""}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-gray-800 truncate">{m.title}</h3>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              {formatDT(m.start_time)}
                            </span>
                            {m.location && (
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                {m.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border flex-shrink-0 ${sc.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                          {sc.label}
                        </span>
                      </div>

                      {/* Meta row */}
                      <div className="flex items-center gap-4 mt-2">
                        {participantCount > 0 && (
                          <div className="flex items-center">
                            <div className="flex -space-x-1.5">
                              {m.participants.slice(0, 4).map((p, i) => (
                                <div key={i} className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-[7px] font-bold border border-white">
                                  {(p.name || "?").charAt(0)}
                                </div>
                              ))}
                              {participantCount > 4 && (
                                <div className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-[7px] font-bold border border-white">
                                  +{participantCount - 4}
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 ml-1.5">{participantCount}</span>
                          </div>
                        )}
                        {agendaCount > 0 && (
                          <span className="text-[10px] text-gray-400">{agendaCount} agenda item{agendaCount !== 1 ? "s" : ""}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => navigate(`/hr/meetings/edit/${m.id}`)} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg" title="Edit">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(m.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Delete">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
