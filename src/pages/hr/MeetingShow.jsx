import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get, post, put, del } from "../../api/axios";
import Swal from "sweetalert2";

const statusConf = {
  scheduled: { label: "Scheduled", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-500" },
  in_progress: { label: "In Progress", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
  completed: { label: "Completed", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  cancelled: { label: "Cancelled", bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-500" },
};

const emptyNote = { key_points: "", action_items_summary: "", reminders: "", additional_notes: "" };

// Bullet list helpers — stores as "line1\nline2\nline3" in the database
function parseBullets(text) {
  if (!text) return [""];
  const lines = text.split("\n").filter((l) => l !== undefined);
  return lines.length ? lines : [""];
}

function bulletsToDB(bullets) {
  return bullets.join("\n");
}

// ── Bullet List Editor (Word-style) ──────────────────────────────────────────
function BulletListEditor({ value, onChange, placeholder }) {
  const [items, setItems] = useState(() => parseBullets(value));
  const inputRefs = useRef([]);
  const isInternal = useRef(false);

  // Sync inward only when value changes externally (e.g. edit mode load)
  const prevValue = useRef(value);
  useEffect(() => {
    if (!isInternal.current && value !== prevValue.current) {
      setItems(parseBullets(value));
    }
    prevValue.current = value;
    isInternal.current = false;
  }, [value]);

  const update = (newItems) => {
    isInternal.current = true;
    setItems(newItems);
    onChange(bulletsToDB(newItems));
  };

  const focusLine = (i) => {
    setTimeout(() => inputRefs.current[i]?.focus(), 0);
  };

  const handleKeyDown = (e, i) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const newItems = [...items];
      newItems.splice(i + 1, 0, "");
      update(newItems);
      focusLine(i + 1);
    } else if (e.key === "Backspace" && items[i] === "" && items.length > 1) {
      e.preventDefault();
      const newItems = items.filter((_, idx) => idx !== i);
      update(newItems);
      focusLine(Math.max(0, i - 1));
    }
  };

  const handleChange = (i, val) => {
    const newItems = [...items];
    newItems[i] = val;
    update(newItems);
  };

  return (
    <div className="border border-amber-200 rounded-lg bg-white overflow-hidden focus-within:ring-2 focus-within:ring-amber-400">
      <div className="px-3 py-2 bg-amber-50/50 border-b border-amber-100 flex items-center gap-1.5">
        <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 100 4 2 2 0 000-4zm6 0a1 1 0 011 1v2a1 1 0 11-2 0V5a1 1 0 011-1zm5 0a1 1 0 011 1v2a1 1 0 11-2 0V5a1 1 0 011-1zM4 8a2 2 0 100 4 2 2 0 000-4zm6 0a1 1 0 011 1v2a1 1 0 11-2 0V9a1 1 0 011-1zm5 0a1 1 0 011 1v2a1 1 0 11-2 0V9a1 1 0 011-1z" clipRule="evenodd" /></svg>
        <span className="text-[9px] text-amber-600 font-medium">Press Enter for new point</span>
      </div>
      <div className="p-2 space-y-0.5 min-h-[80px]">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2 group">
            <div className="mt-2 w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
            <input
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              value={item}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              placeholder={i === 0 ? (placeholder || "Type a point and press Enter...") : "Continue typing..."}
              className="flex-1 px-1 py-1 text-xs text-gray-700 bg-transparent outline-none placeholder-gray-300"
            />
            {items.length > 1 && (
              <button type="button" onClick={() => { const newItems = items.filter((_, idx) => idx !== i); setItems(newItems); }}
                className="mt-1 p-0.5 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Bullet List Display ──────────────────────────────────────────────────────
function BulletListDisplay({ text }) {
  const items = parseBullets(text).filter((l) => l.trim());
  if (!items.length) return null;
  return (
    <ul className="space-y-1.5 pl-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
          <span className="text-xs text-gray-700 leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function MeetingShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const statusRef = useRef(null);

  // Notes state
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteForm, setNoteForm] = useState({ ...emptyNote });
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    get(`/meetings/${id}`).then((r) => setData(r.data?.data || r.data)).catch(() => Swal.fire("Error", "Failed to load", "error")).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const close = (e) => { if (statusRef.current && !statusRef.current.contains(e.target)) setShowStatusMenu(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const changeStatus = async (newStatus) => {
    try {
      await put(`/meetings/${id}`, { status: newStatus });
      setData((p) => ({ ...p, status: newStatus }));
      setShowStatusMenu(false);
      Swal.fire({ icon: "success", title: `Status changed to ${newStatus.replace("_", " ")}`, timer: 1500, showConfirmButton: false });
    } catch { Swal.fire("Error", "Failed to update status", "error"); }
  };

  const handleDelete = async () => {
    const r = await Swal.fire({ title: "Delete meeting?", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Delete" });
    if (r.isConfirmed) { try { await del(`/meetings/${id}`); } catch {} navigate("/hr/meetings"); }
  };

  // ── Notes handlers ──
  const openNewNote = () => {
    setEditingNoteId(null);
    setNoteForm({ ...emptyNote });
    setShowNoteForm(true);
  };

  const openEditNote = (note) => {
    setEditingNoteId(note.id);
    setNoteForm({
      key_points: note.key_points || "",
      action_items_summary: note.action_items_summary || "",
      reminders: note.reminders || "",
      additional_notes: note.additional_notes || "",
    });
    setShowNoteForm(true);
  };

  const cancelNote = () => {
    setShowNoteForm(false);
    setEditingNoteId(null);
    setNoteForm({ ...emptyNote });
  };

  const saveNote = async () => {
    if (!noteForm.key_points.trim()) {
      Swal.fire("Required", "Key points cannot be empty", "warning");
      return;
    }
    setSavingNote(true);
    try {
      if (editingNoteId) {
        const res = await put(`/meetings/${id}/notes/${editingNoteId}`, noteForm);
        setData((p) => ({
          ...p,
          notes: p.notes.map((n) => n.id === editingNoteId ? (res.data?.data || res.data) : n),
        }));
      } else {
        const res = await post(`/meetings/${id}/notes`, noteForm);
        const newNote = res.data?.data || res.data;
        setData((p) => ({ ...p, notes: [newNote, ...(p.notes || [])] }));
      }
      cancelNote();
      Swal.fire({ icon: "success", title: editingNoteId ? "Notes Updated!" : "Notes Saved!", timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to save notes", "error");
    } finally {
      setSavingNote(false);
    }
  };

  const deleteNote = async (noteId) => {
    const r = await Swal.fire({ title: "Delete this note?", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Delete" });
    if (r.isConfirmed) {
      try { await del(`/meetings/${id}/notes/${noteId}`); } catch {}
      setData((p) => ({ ...p, notes: (p.notes || []).filter((n) => n.id !== noteId) }));
    }
  };

  const handleNoteChange = (e) => setNoteForm((p) => ({ ...p, [e.target.name]: e.target.value }));

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
  const notes = data.notes || [];

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
                    <span className={conf.text}>{conf.label}</span>
                    {data.status === key && <svg className="w-3 h-3 ml-auto text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                  </button>
                ))}
              </div>
            )}
          </div>
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

            {/* ── Meeting Notes ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">Meeting Notes</p>
                    <p className="text-[10px] text-amber-600">{notes.length} note{notes.length !== 1 ? "s" : ""} recorded</p>
                  </div>
                </div>
                {!showNoteForm && (
                  <button onClick={openNewNote}
                    className="px-2.5 py-1 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-[10px] font-medium flex items-center gap-1 transition-colors">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Take Notes
                  </button>
                )}
              </div>

              <div className="p-5 space-y-4">
                {/* Note Form (inline) */}
                {showNoteForm && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      <p className="text-xs font-bold text-amber-800">{editingNoteId ? "Edit Notes" : "Record Meeting Notes"}</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-amber-700 mb-1">Key Discussion Points *</label>
                      <BulletListEditor
                        value={noteForm.key_points}
                        onChange={(val) => setNoteForm((p) => ({ ...p, key_points: val }))}
                        placeholder="Type a discussion point and press Enter..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-amber-700 mb-1">Action Items</label>
                      <textarea name="action_items_summary" value={noteForm.action_items_summary} onChange={handleNoteChange} rows={2}
                        placeholder="Tasks assigned, deadlines, who is responsible..."
                        className="w-full px-3 py-2 border border-amber-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none bg-white resize-none placeholder-gray-400" />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-amber-700 mb-1">Reminders</label>
                      <textarea name="reminders" value={noteForm.reminders} onChange={handleNoteChange} rows={2}
                        placeholder="Follow-ups, deadlines, important dates..."
                        className="w-full px-3 py-2 border border-amber-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none bg-white resize-none placeholder-gray-400" />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-amber-700 mb-1">Additional Notes</label>
                      <textarea name="additional_notes" value={noteForm.additional_notes} onChange={handleNoteChange} rows={2}
                        placeholder="Anything else worth noting..."
                        className="w-full px-3 py-2 border border-amber-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none bg-white resize-none placeholder-gray-400" />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button onClick={saveNote} disabled={savingNote}
                        className="px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                        {savingNote ? (
                          <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Saving...</>
                        ) : (
                          <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{editingNoteId ? "Update Notes" : "Save Notes"}</>
                        )}
                      </button>
                      <button onClick={cancelNote} className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Existing Notes */}
                {notes.length === 0 && !showNoteForm && (
                  <div className="text-center py-6">
                    <svg className="w-10 h-10 mx-auto text-gray-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    <p className="text-xs text-gray-400">No notes recorded yet</p>
                    <button onClick={openNewNote} className="mt-2 text-xs font-semibold text-amber-600 hover:text-amber-700">Take first notes</button>
                  </div>
                )}

                {notes.map((note) => (
                  <div key={note.id} className="border border-gray-100 rounded-xl overflow-hidden">
                    {/* Note header */}
                    <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[8px] font-bold">
                          {(note.recorded_by?.name || "?").charAt(0)}
                        </div>
                        <span className="text-[10px] font-medium text-gray-600">{note.recorded_by?.name || "Unknown"}</span>
                        <span className="text-[9px] text-gray-400">{note.recorded_at ? new Date(note.recorded_at).toLocaleString() : ""}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditNote(note)} className="p-1 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Edit">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => deleteNote(note.id)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>

                    {/* Note content */}
                    <div className="p-4 space-y-3">
                      {note.key_points && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Key Points</p>
                          </div>
                          <div className="pl-5">
                            <BulletListDisplay text={note.key_points} />
                          </div>
                        </div>
                      )}
                      {note.action_items_summary && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <svg className="w-3.5 h-3.5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Action Items</p>
                          </div>
                          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap pl-5">{note.action_items_summary}</p>
                        </div>
                      )}
                      {note.reminders && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Reminders</p>
                          </div>
                          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap pl-5">{note.reminders}</p>
                        </div>
                      )}
                      {note.additional_notes && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Additional Notes</p>
                          </div>
                          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap pl-5">{note.additional_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
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
                <div className="flex justify-between"><span className="text-teal-200">Notes</span><span className="font-medium">{notes.length}</span></div>
                <div className="flex justify-between"><span className="text-teal-200">Created</span><span className="font-medium">{data.created_at ? new Date(data.created_at).toLocaleDateString() : "-"}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
