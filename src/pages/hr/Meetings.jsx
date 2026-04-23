import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { get, post, del } from "../../api/axios";
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
  const [typeFilter, setTypeFilter] = useState("all");

  // Assign Task modal
  const [assignModal, setAssignModal] = useState(null); // { meeting }
  const [staffList, setStaffList] = useState([]);
  const [taskForm, setTaskForm] = useState({ staff_id: "", task: "", task_type: "normal", start_date: "", deadline: "", notes: "" });
  const [assigning, setAssigning] = useState(false);

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
      Swal.fire({ icon: "success", title: "Deleted!", timer: 1500, showConfirmButton: false, toast: true, position: "top-end" });
    }
  };

  const openAssignTask = async (meeting) => {
    try {
      const res = await get("/hr/staff-tasks/staff-list");
      setStaffList(res.data?.data || res.data || []);
    } catch {
      setStaffList([]);
    }
    setTaskForm({
      staff_id: "",
      task: "",
      task_type: "normal",
      start_date: new Date().toISOString().split("T")[0],
      deadline: "",
      notes: `Assigned during meeting: ${meeting.title}`,
    });
    setAssignModal({ meeting });
  };

  const submitAssignTask = async () => {
    if (!taskForm.staff_id || !taskForm.task.trim() || !taskForm.start_date) {
      Swal.fire("Missing fields", "Pick a staff member, enter the task, and pick a start date", "warning"); return;
    }
    setAssigning(true);
    try {
      await post(`/meetings/${assignModal.meeting.id}/tasks`, taskForm);
      Swal.fire({ icon: "success", title: "Task assigned", timer: 1200, showConfirmButton: false, toast: true, position: "top-end" });
      setAssignModal(null);
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to assign task", "error");
    } finally {
      setAssigning(false);
    }
  };

  let filtered = items;
  if (filter !== "all") filtered = filtered.filter((i) => i.status === filter);
  if (typeFilter !== "all") filtered = filtered.filter((i) => (i.meeting_type || "routine") === typeFilter);
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title or location…"
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white" />
          </div>
          <div className="flex gap-1 flex-wrap">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider self-center">Type:</span>
            {[
              { key: "all", label: "All" },
              { key: "routine", label: "Routine" },
              { key: "emergency", label: "Emergency" },
            ].map((t) => (
              <button key={t.key} onClick={() => setTypeFilter(t.key)}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${typeFilter === t.key ? (t.key === "emergency" ? "bg-red-600 text-white" : "bg-teal-600 text-white") : "bg-gray-50 border border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 flex-wrap">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider self-center">Status:</span>
            {["all", "scheduled", "in_progress", "completed", "cancelled"].map((s) => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold capitalize transition-colors ${filter === s ? "bg-teal-600 text-white" : "bg-gray-50 border border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                {s === "all" ? "All" : s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <svg className="w-12 h-12 mx-auto text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <p className="text-sm text-gray-400 font-medium">No meetings found</p>
            <button onClick={() => navigate("/hr/meetings/create")} className="mt-3 text-xs font-semibold text-teal-600 hover:text-teal-700">Schedule one</button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">People</th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Agenda</th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((m) => {
                    const sc = statusConf[m.status] || statusConf.scheduled;
                    const participantCount = m.participants?.length || 0;
                    const agendaCount = m.agenda_items?.length || 0;
                    const isPast = m.end_time && new Date(m.end_time) < new Date();
                    const isEmergency = m.meeting_type === "emergency";

                    return (
                      <tr key={m.id} onClick={() => navigate(`/hr/meetings/show/${m.id}`)}
                        className={`hover:bg-gray-50/60 cursor-pointer transition-colors ${isPast && m.status === "scheduled" ? "opacity-70" : ""}`}>
                        {/* Date */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0 border ${isEmergency ? "bg-red-50 border-red-100" : "bg-teal-50 border-teal-100"}`}>
                              <span className={`text-[8px] font-bold uppercase ${isEmergency ? "text-red-600" : "text-teal-600"}`}>{m.start_time ? new Date(m.start_time).toLocaleDateString("en-US", { month: "short" }) : ""}</span>
                              <span className={`text-sm font-black -mt-0.5 ${isEmergency ? "text-red-700" : "text-teal-700"}`}>{m.start_time ? new Date(m.start_time).getDate() : ""}</span>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold text-gray-700">{formatDT(m.start_time)}</p>
                              <p className="text-[9px] text-gray-400">→ {formatDT(m.end_time)}</p>
                            </div>
                          </div>
                        </td>
                        {/* Title */}
                        <td className="px-4 py-3">
                          <p className="text-xs font-bold text-gray-800 truncate max-w-[200px]">{m.title}</p>
                          {m.organizer?.name && <p className="text-[10px] text-gray-400 truncate">by {m.organizer.name}</p>}
                        </td>
                        {/* Type */}
                        <td className="px-4 py-3">
                          {isEmergency ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 text-[9px] font-bold">
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                              EMERGENCY
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 text-[9px] font-bold">
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              ROUTINE
                            </span>
                          )}
                        </td>
                        {/* Location */}
                        <td className="px-4 py-3">
                          <p className="text-[11px] text-gray-600 truncate max-w-[140px]">{m.location || "—"}</p>
                        </td>
                        {/* People */}
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-600">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            {participantCount}
                          </span>
                        </td>
                        {/* Agenda */}
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-600">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                            {agendaCount}
                          </span>
                        </td>
                        {/* Status */}
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold border ${sc.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                            {sc.label}
                          </span>
                        </td>
                        {/* Actions */}
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex gap-1">
                            <button onClick={() => navigate(`/hr/meetings/show/${m.id}`)} className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg" title="View details">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                            <button onClick={() => openAssignTask(m)} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Assign task from meeting">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                            </button>
                            <button onClick={() => navigate(`/hr/meetings/edit/${m.id}`)} className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg" title="Edit">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => handleDelete(m.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Assign Task Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setAssignModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-500 to-indigo-600">
              <h3 className="text-sm font-bold text-white">Assign Task from Meeting</h3>
              <p className="text-[11px] text-white/80 mt-0.5 truncate">"{assignModal.meeting.title}"</p>
            </div>
            <div className="p-5 space-y-3 overflow-y-auto">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Staff Member *</label>
                <SearchableStaffSelect
                  options={staffList}
                  value={taskForm.staff_id}
                  onChange={(v) => setTaskForm((p) => ({ ...p, staff_id: v }))}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Task Description *</label>
                <textarea value={taskForm.task} onChange={(e) => setTaskForm((p) => ({ ...p, task: e.target.value }))} rows={3} placeholder="What needs to be done…" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-400 bg-white resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Priority *</label>
                  <select value={taskForm.task_type} onChange={(e) => setTaskForm((p) => ({ ...p, task_type: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-400 bg-white">
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Start Date *</label>
                  <input type="date" value={taskForm.start_date} onChange={(e) => setTaskForm((p) => ({ ...p, start_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-400 bg-white" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Deadline</label>
                <input type="date" value={taskForm.deadline} onChange={(e) => setTaskForm((p) => ({ ...p, deadline: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-400 bg-white" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Notes</label>
                <textarea value={taskForm.notes} onChange={(e) => setTaskForm((p) => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Additional context…" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-400 bg-white resize-none" />
              </div>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setAssignModal(null)} className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={submitAssignTask} disabled={assigning} className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50 flex items-center gap-2">
                {assigning ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Assigning…</> : "Assign Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Searchable staff picker (select2-style) ─────────────────────────────────
function SearchableStaffSelect({ options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const labelOf = (s) => s.name || s.full_name || s.application?.full_name || `Staff #${s.id || s.employee_id}`;
  const selected = options.find((s) => String(s.id) === String(value));
  const filtered = !query ? options : options.filter((s) => labelOf(s).toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full px-3 py-2 border rounded-xl text-xs bg-white flex items-center justify-between gap-2 ${open ? "border-indigo-400 ring-2 ring-indigo-200" : "border-gray-200 hover:border-gray-300"}`}
      >
        <span className={selected ? "text-gray-800 font-medium" : "text-gray-400"}>
          {selected ? labelOf(selected) : "Search & select staff…"}
        </span>
        <svg className={`w-3 h-3 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a name…"
                className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white outline-none"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-xs text-gray-400 text-center">No staff found</p>
            ) : (
              filtered.map((s) => {
                const isSelected = String(s.id) === String(value);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { onChange(s.id); setOpen(false); setQuery(""); }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${isSelected ? "bg-indigo-50 text-indigo-700 font-semibold" : "hover:bg-gray-50 text-gray-700"}`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${isSelected ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                      {labelOf(s).split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <span className="flex-1 truncate">{labelOf(s)}</span>
                    {isSelected && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
