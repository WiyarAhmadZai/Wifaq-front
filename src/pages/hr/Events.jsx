import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get, del } from "../../api/axios";
import Swal from "sweetalert2";

const statusConf = {
  upcoming: { label: "Upcoming", color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500", bar: "bg-blue-500" },
  ongoing: { label: "Ongoing", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", bar: "bg-amber-500" },
  completed: { label: "Completed", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", bar: "bg-emerald-500" },
  cancelled: { label: "Cancelled", color: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500", bar: "bg-red-500" },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Events() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("list"); // list | calendar
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

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

  // ── Calendar helpers ──
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const monthLabel = new Date(calYear, calMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const today = new Date();
  const isToday = (day) => today.getDate() === day && today.getMonth() === calMonth && today.getFullYear() === calYear;

  const getEventsForDay = (day) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return items.filter((ev) => {
      if (ev.status === "cancelled") return false;
      const start = ev.start_date?.split("T")[0];
      const end = ev.end_date?.split("T")[0] || start;
      return start && dateStr >= start && dateStr <= end;
    });
  };

  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); } else setCalMonth((m) => m - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); } else setCalMonth((m) => m + 1); };
  const goToday = () => { setCalMonth(today.getMonth()); setCalYear(today.getFullYear()); };

  // Build calendar grid
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="bg-teal-600 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-white">Events</h1>
            <p className="text-xs text-teal-100 mt-0.5">{items.length} event{items.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex bg-white/20 rounded-lg p-0.5">
              <button onClick={() => setView("list")}
                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors ${view === "list" ? "bg-white text-teal-700" : "text-white hover:bg-white/10"}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <button onClick={() => setView("calendar")}
                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors ${view === "calendar" ? "bg-white text-teal-700" : "text-white hover:bg-white/10"}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </button>
            </div>
            <button onClick={() => navigate("/hr/events/create")}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              New Event
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* ── CALENDAR VIEW ── */}
        {view === "calendar" && (
          <>
            {/* Month navigation */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-black text-gray-800">{monthLabel}</h2>
                  <button onClick={goToday} className="px-2 py-0.5 text-[9px] font-semibold text-teal-600 bg-teal-50 rounded-full hover:bg-teal-100 transition-colors">Today</button>
                </div>
                <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAYS.map((day) => (
                  <div key={day} className="text-center text-[9px] font-bold text-gray-400 uppercase tracking-wider py-2">{day}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 border-t border-l border-gray-100">
                {calendarDays.map((day, i) => {
                  if (day === null) return <div key={`empty-${i}`} className="border-r border-b border-gray-100 bg-gray-50/50 min-h-[90px]" />;
                  const dayEvents = getEventsForDay(day);
                  const todayClass = isToday(day);
                  return (
                    <div key={day}
                      className={`border-r border-b border-gray-100 min-h-[90px] p-1.5 transition-colors hover:bg-teal-50/30 ${todayClass ? "bg-teal-50/50" : ""}`}>
                      {/* Day number */}
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-full ${todayClass ? "bg-teal-600 text-white" : "text-gray-700"}`}>
                          {day}
                        </span>
                        {dayEvents.length > 0 && !todayClass && (
                          <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
                        )}
                      </div>
                      {/* Events */}
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 2).map((ev) => {
                          const sc = statusConf[ev.status] || statusConf.upcoming;
                          return (
                            <button key={ev.id} onClick={() => navigate(`/hr/events/show/${ev.id}`)}
                              className={`w-full text-left px-1.5 py-0.5 rounded text-[8px] font-semibold truncate ${sc.bar} text-white hover:opacity-80 transition-opacity`}>
                              {ev.title}
                            </button>
                          );
                        })}
                        {dayEvents.length > 2 && (
                          <p className="text-[8px] text-gray-400 font-medium pl-1">+{dayEvents.length - 2} more</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Events this month summary */}
            {(() => {
              const monthEvents = items.filter((ev) => {
                const start = ev.start_date ? new Date(ev.start_date) : null;
                return start && start.getMonth() === calMonth && start.getFullYear() === calYear;
              });
              if (monthEvents.length === 0) return null;
              return (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <h3 className="text-xs font-bold text-gray-800 mb-3">Events in {monthLabel} ({monthEvents.length})</h3>
                  <div className="space-y-2">
                    {monthEvents.sort((a, b) => new Date(a.start_date) - new Date(b.start_date)).map((ev) => {
                      const sc = statusConf[ev.status] || statusConf.upcoming;
                      return (
                        <div key={ev.id} onClick={() => navigate(`/hr/events/show/${ev.id}`)}
                          className="flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors">
                          <div className={`w-1 h-10 rounded-full ${sc.bar} flex-shrink-0`} />
                          <div className="w-10 h-10 bg-teal-50 rounded-lg flex flex-col items-center justify-center flex-shrink-0 border border-teal-100">
                            <span className="text-[8px] font-bold text-teal-600 uppercase">{new Date(ev.start_date).toLocaleDateString("en-US", { month: "short" })}</span>
                            <span className="text-sm font-black text-teal-700 -mt-0.5">{new Date(ev.start_date).getDate()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">{ev.title}</p>
                            <p className="text-[10px] text-gray-400">{ev.location || "No location"}</p>
                          </div>
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold border flex-shrink-0 ${sc.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>{sc.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* ── LIST VIEW ── */}
        {view === "list" && (
          <>
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
                      <div className={`h-1 ${sc.bar}`} />
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
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
                              <div className="flex items-center gap-3 mt-2">
                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold border ${sc.color}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>{sc.label}
                                </span>
                                {rolesCount > 0 && <span className="text-[9px] text-gray-400">{rolesCount} role{rolesCount !== 1 ? "s" : ""}</span>}
                                {reqCount > 0 && <span className="text-[9px] text-gray-400">{doneCount}/{reqCount} done</span>}
                              </div>
                            </div>
                          </div>
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
          </>
        )}
      </div>
    </div>
  );
}
