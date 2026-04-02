import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get, del } from "../../api/axios";
import Swal from "sweetalert2";

const statusConf = {
  upcoming: { label: "Upcoming", color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  ongoing: { label: "Ongoing", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  completed: { label: "Completed", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  cancelled: { label: "Cancelled", color: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
};

export default function Events() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    try { const res = await get("/events"); setItems(res.data?.data || res.data || []); }
    catch { setItems([]); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    const r = await Swal.fire({ title: "Delete event?", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Delete" });
    if (r.isConfirmed) { try { await del(`/events/${id}`); } catch {} setItems((p) => p.filter((i) => i.id !== id)); Swal.fire({ icon: "success", title: "Deleted!", timer: 1500, showConfirmButton: false }); }
  };

  let filtered = items;
  if (filter !== "all") filtered = filtered.filter((i) => i.status === filter);
  if (search) { const q = search.toLowerCase(); filtered = filtered.filter((i) => (i.title || "").toLowerCase().includes(q) || (i.location || "").toLowerCase().includes(q)); }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="bg-teal-600 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-white">Events</h1>
            <p className="text-xs text-teal-100 mt-0.5">{items.length} event{items.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={() => navigate("/hr/events/create")}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Event
          </button>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search events..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white" />
          </div>
          <div className="flex gap-1">
            {["all", "upcoming", "ongoing", "completed", "cancelled"].map((s) => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-2 rounded-xl text-[10px] font-semibold capitalize transition-colors ${filter === s ? "bg-teal-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-teal-300"}`}>
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <svg className="w-12 h-12 mx-auto text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <p className="text-sm text-gray-400 font-medium">No events found</p>
            <button onClick={() => navigate("/hr/events/create")} className="mt-3 text-xs font-semibold text-teal-600 hover:text-teal-700">Create one</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((ev) => {
              const sc = statusConf[ev.status] || statusConf.upcoming;
              const rolesCount = ev.roles?.length || 0;
              const reqCount = ev.requirements?.length || 0;
              const doneCount = (ev.requirements || []).filter((r) => r.is_completed).length;
              const isMultiDay = ev.end_date && ev.start_date !== ev.end_date;

              return (
                <div key={ev.id} onClick={() => navigate(`/hr/events/show/${ev.id}`)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden">
                  {/* Color bar */}
                  <div className={`h-1 ${sc.dot}`} />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Date block */}
                        <div className="w-12 h-12 bg-teal-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border border-teal-100">
                          <span className="text-[8px] font-bold text-teal-600 uppercase">{ev.start_date ? new Date(ev.start_date).toLocaleDateString("en-US", { month: "short" }) : ""}</span>
                          <span className="text-lg font-black text-teal-700 -mt-0.5">{ev.start_date ? new Date(ev.start_date).getDate() : ""}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-gray-800 truncate">{ev.title}</h3>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400 flex-wrap">
                            <span>{formatDate(ev.start_date)}{isMultiDay ? ` - ${formatDate(ev.end_date)}` : ""}</span>
                            {ev.location && <span className="flex items-center gap-0.5"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>{ev.location}</span>}
                          </div>
                          {/* Meta */}
                          <div className="flex items-center gap-3 mt-2">
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold border ${sc.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>{sc.label}
                            </span>
                            {rolesCount > 0 && <span className="text-[9px] text-gray-400">{rolesCount} role{rolesCount !== 1 ? "s" : ""}</span>}
                            {reqCount > 0 && <span className="text-[9px] text-gray-400">{doneCount}/{reqCount} done</span>}
                          </div>
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => navigate(`/hr/events/edit/${ev.id}`)} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                        <button onClick={() => handleDelete(ev.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
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
