import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useSmartBack from "../../hooks/useSmartBack";
import { get, post, put, del, peekCache } from "../../api/axios";
import Swal from "sweetalert2";
import { useResourcePermissions } from "../../admin/utils/useResourcePermissions";

import { fmtDate, fmtDateTime } from "../../utils/formErrors";

import { DateField } from "../../components/hr/HrUI";
const statusConf = {
  scheduled: { label: "Scheduled", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-500" },
  in_progress: { label: "In Progress", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
  completed: { label: "Completed", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  cancelled: { label: "Cancelled", bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-500" },
  ended: { label: "Ended", bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-600", dot: "bg-gray-400" },
};

/* Deliberately NOT part of statusConf: that object doubles as the list of
 * statuses the badge menu offers, and "put this back to draft" is not a move
 * anyone should be able to make. The invitations have already gone out —
 * quietly hiding the meeting again would be worse than useless. Publishing is
 * one-way; this entry exists only so a draft renders honestly. */
const draftConf = { label: "Draft", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", dot: "bg-amber-500" };

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

export default function MeetingShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  // Back returns to wherever the user came from — the filtered list, a
  // dashboard, a notification — not always to the top of the module.
  const goBack = useSmartBack("/hr/meetings");
  const { canUpdate, canDelete } = useResourcePermissions("meetings");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const statusRef = useRef(null);

  // Notes state
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteForm, setNoteForm] = useState({ ...emptyNote });
  const [savingNote, setSavingNote] = useState(false);

  // Current user (from local storage, written by the auth layer)
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } })();

  // Propose agenda modal state
  const [showProposeAgenda, setShowProposeAgenda] = useState(false);
  const [proposeForm, setProposeForm] = useState({ title: "", description: "", duration_min: 15 });
  const [proposing, setProposing] = useState(false);

  // Assign task modal state
  const [showAssignTask, setShowAssignTask] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [taskForm, setTaskForm] = useState({ staff_id: "", task: "", task_type: "normal", start_date: "", deadline: "", notes: "" });
  const [assigningTask, setAssigningTask] = useState(false);

  // Backend-driven gate flags. Populated from the meeting show response so
  // the UI hides edit/delete/notes-edit/assign-task buttons when the current
  // user is just a participant (no meetings.* permission), or once the
  // meeting start time has passed.
  const [perms, setPerms] = useState({
    can_manage: false,
    is_locked: false,
    can_edit: false,
    can_delete: false,
    can_assign_task: false,
    can_add_note: false,
    can_edit_note: false,
    can_delete_note: false,
    can_add_agenda: false,
  });

  const loadMeeting = useCallback(() => {
    const __cached = peekCache(`/meetings/${id}`);
    if (__cached) {
      setData(__cached?.data || __cached);
      setLoading(false);
    }
    return get(`/meetings/${id}`).then((r) => setData(r.data?.data || r.data));
  }, [id]);

  useEffect(() => {
    loadMeeting().catch(() => Swal.fire("Error", "Failed to load", "error")).finally(() => setLoading(false));
  }, [id, loadMeeting]);

  const [respondingRsvp, setRespondingRsvp] = useState(false);
  const respondRsvp = async (status) => {
    let reason = null;
    if (status === "declined") {
      const { value, isConfirmed } = await Swal.fire({
        title: "Can't attend?",
        input: "textarea",
        inputLabel: "Please give a brief reason",
        inputPlaceholder: "e.g. On leave that day / clashes with another meeting…",
        inputValidator: (v) => (!v || !v.trim() ? "A reason is required to decline" : undefined),
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        confirmButtonText: "Send response",
      });
      if (!isConfirmed) return;
      reason = (value || "").trim();
    }
    setRespondingRsvp(true);
    try {
      await post(`/meetings/${id}/respond`, { status, reason });
      await loadMeeting();
      Swal.fire({ icon: "success", title: status === "accepted" ? "Marked as attending" : "Response sent", timer: 1400, showConfirmButton: false, toast: true, position: "top-end" });
      window.dispatchEvent(new Event("wen:notifications-refresh"));
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Could not record your response", "error");
    } finally {
      setRespondingRsvp(false);
    }
  };

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
    if (r.isConfirmed) { try { await del(`/meetings/${id}`); } catch {} goBack(); }
  };

  const handleCopy = async () => {
    const r = await Swal.fire({
      title: "Copy this meeting?",
      text: `A duplicate of "${data?.title}" will be created on the same weekday & time, with the date moved forward. You can then adjust the date before saving.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#0d9488",
      confirmButtonText: "Create copy",
    });
    if (!r.isConfirmed) return;
    try {
      const res = await post(`/meetings/${id}/copy`);
      const created = res.data?.data;
      Swal.fire({ icon: "success", title: "Copy created", timer: 1400, showConfirmButton: false, toast: true, position: "top-end" });
      if (created?.id) navigate(`/hr/meetings/edit/${created.id}`);
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to copy meeting", "error");
    }
  };

  const handleContinue = async () => {
    const r = await Swal.fire({
      title: "Continue in a follow-up?",
      html: `This will schedule a follow-up session of <b>"${data?.title}"</b> on the same weekday & time next week, carry over the participants, agenda and pending action items, and notify everyone.<br/><br/>This session will be marked <b>completed</b>.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#0d9488",
      confirmButtonText: "Schedule follow-up",
    });
    if (!r.isConfirmed) return;
    try {
      const res = await post(`/meetings/${id}/continue`);
      const created = res.data?.data;
      Swal.fire({ icon: "success", title: res.data?.message || "Follow-up scheduled", timer: 2200, showConfirmButton: false, toast: true, position: "top-end" });
      if (created?.id) navigate(`/hr/meetings/show/${created.id}`);
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to schedule follow-up", "error");
    }
  };

  // ── Propose agenda item (participant flow) ──
  const isOrganizer = data && currentUser?.id && data.organizer_id === currentUser.id;
  const isParticipant = data && currentUser?.id && (data.participants || []).some((p) => p.id === currentUser.id);
  // Adding / proposing agenda items requires the meeting to still be in the
  // future. Backend can_add_agenda combines participant-or-manager + not-locked.
  const canProposeAgenda = perms.can_add_agenda;

  const submitProposeAgenda = async () => {
    if (!proposeForm.title.trim()) {
      Swal.fire("Missing", "Please enter a topic", "warning"); return;
    }
    setProposing(true);
    try {
      const res = await post(`/meetings/${id}/agenda-items`, proposeForm);
      const newItem = res.data?.data;
      setData((p) => ({ ...p, agenda_items: [...(p.agenda_items || []), newItem] }));
      setShowProposeAgenda(false);
      setProposeForm({ title: "", description: "", duration_min: 15 });
      Swal.fire({ icon: "success", title: "Agenda item added", timer: 1200, showConfirmButton: false, toast: true, position: "top-end" });
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to add", "error");
    } finally {
      setProposing(false);
    }
  };

  const deleteAgendaItem = async (itemId) => {
    const ok = await Swal.fire({ title: "Remove this item?", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444" });
    if (!ok.isConfirmed) return;
    try {
      await del(`/meetings/${id}/agenda-items/${itemId}`);
      setData((p) => ({ ...p, agenda_items: (p.agenda_items || []).filter((a) => a.id !== itemId) }));
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Cannot remove", "error");
    }
  };

  // ── Assign task (organizer only) ──
  const openAssignTask = async () => {
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
      notes: `Assigned during meeting: ${data?.title || ""}`,
    });
    setShowAssignTask(true);
  };

  const submitAssignTask = async () => {
    if (!taskForm.staff_id || !taskForm.task.trim() || !taskForm.start_date) {
      Swal.fire("Missing fields", "Pick a staff member, enter the task, and pick a start date", "warning"); return;
    }
    setAssigningTask(true);
    try {
      const res = await post(`/meetings/${id}/tasks`, taskForm);
      const newTask = res.data?.data;
      setData((p) => ({ ...p, tasks: [...(p.tasks || []), newTask] }));
      setShowAssignTask(false);
      Swal.fire({ icon: "success", title: "Task assigned", timer: 1200, showConfirmButton: false, toast: true, position: "top-end" });
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to assign task", "error");
    } finally {
      setAssigningTask(false);
    }
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

  // Display the clock-derived status (e.g. "In Progress" while it's happening);
  // the dropdown below still edits the canonical stored status.
  const isDraft = data.status === "draft";
  const sc = isDraft ? draftConf : (statusConf[data.live_status || data.status] || statusConf.scheduled);
  const formatDT = (dt) => dt ? fmtDateTime(dt) : "-";
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
          <button onClick={goBack} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-bold text-white">Meeting Details</h1>
            <p className="text-xs text-teal-100 mt-0.5">#{String(data.id).padStart(4, "0")}</p>
          </div>
          {canUpdate && (
            <button onClick={handleContinue} className="px-3 py-1.5 bg-white text-teal-700 hover:bg-teal-50 text-xs font-bold rounded-xl">Continue →</button>
          )}
          {canUpdate && (
            <button onClick={handleCopy} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl">Copy</button>
          )}
          {canUpdate && (
            <button onClick={() => navigate(`/hr/meetings/edit/${id}`)} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl">Edit</button>
          )}
          {canDelete && perms.can_delete && (
            <button onClick={handleDelete} className="px-3 py-1.5 bg-red-500/80 hover:bg-red-500 text-white text-xs font-semibold rounded-xl">Delete</button>
          )}
          {perms.is_locked && (
            <span className="px-2.5 py-1 bg-amber-500/80 text-white text-[10px] font-semibold rounded-xl flex items-center gap-1" title="Meeting has started — editing is locked">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              Locked
            </span>
          )}
        </div>
        <h2 className="text-lg font-black text-white">{data.title}</h2>
        <div className="flex items-center gap-2 mt-2">
          {isDraft ? (
            /* An unfinished draft has one sensible action: go and finish it. */
            <button onClick={() => navigate(`/hr/meetings/edit/${id}`)}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border hover:opacity-80 transition-opacity ${sc.bg} ${sc.text} ${sc.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
              Draft — continue planning
            </button>
          ) : (
          <div className="relative" ref={statusRef}>
            <button onClick={() => setShowStatusMenu(!showStatusMenu)}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border cursor-pointer hover:opacity-80 transition-opacity ${sc.bg} ${sc.text} ${sc.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${data.live_status === "in_progress" ? "animate-pulse" : ""}`}></span>
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
          )}
          {data.meeting_type === "emergency" && (
            <span className="flex items-center gap-1 px-2.5 py-0.5 bg-red-500 text-white text-[11px] font-bold rounded-full">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              EMERGENCY
            </span>
          )}
          {data.meeting_type === "routine" && (
            <span className="px-2.5 py-0.5 bg-white/20 text-white text-[11px] font-semibold rounded-full">Routine</span>
          )}
          <span className="px-2.5 py-0.5 bg-white/20 text-white text-[11px] font-semibold rounded-full">{getDuration()}</span>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* RSVP banner — shown to the current user when they're an invitee.
            Hidden entirely once the meeting has passed; otherwise only the
            opposite-action button is shown so you can't re-confirm the same
            answer (and re-notify the organizer). */}
        {isParticipant && data.end_time && new Date(data.end_time) >= new Date() && (() => {
          const mine = (data.participants || []).find((p) => p.id === currentUser.id);
          const myStatus = mine?.pivot?.status || "invited";
          const myReason = mine?.pivot?.response_reason;
          return (
            <div className={`rounded-2xl border p-4 ${
              myStatus === "accepted" ? "bg-emerald-50 border-emerald-200"
              : myStatus === "declined" ? "bg-red-50 border-red-200"
              : "bg-amber-50 border-amber-200"}`}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs font-bold text-gray-800">
                    {myStatus === "accepted" ? "You're attending this meeting"
                      : myStatus === "declined" ? "You marked: can't attend"
                      : "Will you attend this meeting?"}
                  </p>
                  {myStatus === "declined" && myReason && (
                    <p className="text-[11px] text-red-700 mt-1">Reason: {myReason}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Show "Attend" unless already attending */}
                  {myStatus !== "accepted" && (
                    <button
                      disabled={respondingRsvp}
                      onClick={() => respondRsvp("accepted")}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold disabled:opacity-50 bg-emerald-600 text-white hover:bg-emerald-700">
                      Attend
                    </button>
                  )}
                  {/* Show "Can't attend" unless already declined */}
                  {myStatus !== "declined" && (
                    <button
                      disabled={respondingRsvp}
                      onClick={() => respondRsvp("declined")}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold disabled:opacity-50 bg-white border border-red-300 text-red-600 hover:bg-red-50">
                      Can't attend
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Continuation chain — links to earlier / later sessions of this discussion */}
        {(data.continued_from || (data.continuations && data.continuations.length > 0)) && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 space-y-2">
            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              Continued Discussion
            </p>
            {data.continued_from && (
              <button onClick={() => navigate(`/hr/meetings/show/${data.continued_from.id}`)}
                className="w-full flex items-center gap-2 text-left text-xs text-indigo-700 hover:text-indigo-900 hover:underline">
                <span className="text-indigo-400">←</span>
                <span className="font-semibold">Continues from:</span>
                <span className="truncate">{data.continued_from.title}</span>
                <span className="text-indigo-400 ml-auto whitespace-nowrap">{fmtDate(data.continued_from.start_time)}</span>
              </button>
            )}
            {(data.continuations || []).map((c) => (
              <button key={c.id} onClick={() => navigate(`/hr/meetings/show/${c.id}`)}
                className="w-full flex items-center gap-2 text-left text-xs text-indigo-700 hover:text-indigo-900 hover:underline">
                <span className="text-indigo-400">→</span>
                <span className="font-semibold">Continued in:</span>
                <span className="truncate">{c.title}</span>
                <span className="text-indigo-400 ml-auto whitespace-nowrap">{fmtDate(c.start_time)}</span>
              </button>
            ))}
          </div>
        )}

        {/* Tasks carried from the previous session — shows live completion so
            you can see at a glance what was done and what's still outstanding. */}
        {data.continued_from && (data.continued_from.tasks || []).length > 0 && (() => {
          const ptasks = data.continued_from.tasks || [];
          const done = ptasks.filter((t) => t.status === "completed").length;
          const statusColor = { pending: "bg-amber-100 text-amber-700", in_progress: "bg-blue-100 text-blue-700", completed: "bg-emerald-100 text-emerald-700" };
          return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
                <p className="text-sm font-bold text-gray-800">Tasks from previous session</p>
                <p className="text-[10px] text-amber-700">{done} of {ptasks.length} completed · carried from "{data.continued_from.title}"</p>
              </div>
              <div className="p-5 space-y-2">
                {ptasks.map((t) => {
                  const isDone = t.status === "completed";
                  return (
                    <div key={t.id} className={`p-3 border rounded-xl flex items-start justify-between gap-2 ${isDone ? "border-emerald-100 bg-emerald-50/40" : "border-amber-100 bg-amber-50/30"}`}>
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <span className={`mt-0.5 font-bold ${isDone ? "text-emerald-600" : "text-amber-500"}`}>{isDone ? "✓" : "○"}</span>
                        <div className="min-w-0">
                          <p className={`text-xs font-semibold ${isDone ? "text-gray-500 line-through" : "text-gray-800"}`}>{t.task}</p>
                          <p className="text-[10px] text-gray-500">
                            {t.staff_name || t.staff?.application?.full_name || `Staff #${t.staff_id}`}
                            {!isDone && t.progress ? ` · ${t.progress}%` : ""}
                            {t.deadline ? ` · due ${fmtDate(t.deadline)}` : ""}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${statusColor[t.status] || statusColor.pending}`}>{t.status?.replace("_", " ")}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

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
                <div className="flex items-center gap-2">
                  {totalAgendaMin > 0 && <span className="text-[10px] font-semibold text-teal-600">{totalAgendaMin} min total</span>}
                  {canProposeAgenda && (
                    <button onClick={() => setShowProposeAgenda(true)} className="px-2.5 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-[10px] font-medium flex items-center gap-1 transition-colors">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      {isOrganizer ? "Add Item" : "Propose Item"}
                    </button>
                  )}
                </div>
              </div>
              <div className="p-5">
                {(data.agenda_items || []).length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No agenda items</p>
                ) : (
                  <div className="space-y-3">
                    {data.agenda_items.map((a, i) => {
                      const submitterName = a.submitted_by?.name;
                      const isMine = a.submitted_by_id && currentUser?.id === a.submitted_by_id;
                      // Author can always remove their own; managers (creator
                      // / admin / meetings.* perm) can remove any. After the
                      // meeting starts nothing can be removed.
                      const canRemove = !perms.is_locked && (isMine || perms.can_manage);
                      return (
                      <div key={a.id || i} className="flex gap-3 group">
                        <div className="w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-gray-800">{a.title}</p>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {a.duration_min > 0 && <span className="text-[10px] text-gray-400">{a.duration_min} min</span>}
                              {canRemove && a.id && (
                                <button onClick={() => deleteAgendaItem(a.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Remove">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              )}
                            </div>
                          </div>
                          {a.description && <p className="text-[10px] text-gray-500 mt-0.5">{a.description}</p>}
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            {a.assigned_to && <span className="text-[10px] text-teal-600 font-medium">Presenter: {a.assigned_to.name}</span>}
                            {submitterName && submitterName !== data.organizer?.name && (
                              <span className="text-[10px] text-gray-400 italic">Proposed by {submitterName}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      );
                    })}
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
                {!showNoteForm && perms.can_add_note && (
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
                    {perms.can_add_note && (
                      <button onClick={openNewNote} className="mt-2 text-xs font-semibold text-amber-600 hover:text-amber-700">Take first notes</button>
                    )}
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
                        <span className="text-[9px] text-gray-400">{note.recorded_at ? fmtDateTime(note.recorded_at) : ""}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {perms.can_edit_note && (
                          <button onClick={() => openEditNote(note)} className="p-1 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Edit">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                        )}
                        {perms.can_delete_note && (
                          <button onClick={() => deleteNote(note.id)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        )}
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

            {/* ── Tasks Assigned from this Meeting ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-5 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">Tasks from this meeting</p>
                    <p className="text-[10px] text-indigo-600">{(data.tasks || []).length} task{(data.tasks || []).length !== 1 ? "s" : ""} assigned</p>
                  </div>
                </div>
                {perms.can_assign_task && (
                  <button onClick={openAssignTask} className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-[10px] font-medium flex items-center gap-1 transition-colors">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Assign Task
                  </button>
                )}
              </div>
              <div className="p-5">
                {(data.tasks || []).length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No tasks assigned yet</p>
                ) : (
                  <div className="space-y-2">
                    {data.tasks.map((t) => {
                      const priority = { urgent: "bg-red-100 text-red-700", high: "bg-orange-100 text-orange-700", normal: "bg-blue-100 text-blue-700", low: "bg-gray-100 text-gray-600" };
                      const statusColor = { pending: "bg-amber-100 text-amber-700", in_progress: "bg-blue-100 text-blue-700", completed: "bg-emerald-100 text-emerald-700" };
                      return (
                        <div key={t.id} className="p-3 border border-gray-100 rounded-xl hover:border-indigo-200 transition-colors">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-xs font-semibold text-gray-800 flex-1">{t.task}</p>
                            <div className="flex gap-1 flex-shrink-0">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${priority[t.task_type] || priority.normal}`}>{t.task_type?.toUpperCase()}</span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusColor[t.status] || statusColor.pending}`}>{t.status?.replace("_", " ")}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-gray-500">
                            <span className="flex items-center gap-1">
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                              {t.staff_name || t.staff?.application?.full_name || `Staff #${t.staff_id}`}
                            </span>
                            {t.deadline && (
                              <span className="flex items-center gap-1">
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                Deadline: {fmtDate(t.deadline)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
                          {p.pivot?.status === "declined" && p.pivot?.response_reason && (
                            <p className="text-[10px] text-red-600 truncate" title={p.pivot.response_reason}>✗ {p.pivot.response_reason}</p>
                          )}
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
                <div className="flex justify-between"><span className="text-teal-200">Created</span><span className="font-medium">{data.created_at ? fmtDate(data.created_at) : "-"}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Propose Agenda Item Modal */}
      {showProposeAgenda && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowProposeAgenda(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 bg-gradient-to-r from-teal-500 to-teal-600">
              <h3 className="text-sm font-bold text-white">{isOrganizer ? "Add Agenda Item" : "Propose Agenda Item"}</h3>
              <p className="text-[11px] text-white/80 mt-0.5">Your proposal will be visible to the organizer and participants</p>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Topic *</label>
                <input type="text" value={proposeForm.title} onChange={(e) => setProposeForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Budget review for Q2" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Description</label>
                <textarea value={proposeForm.description} onChange={(e) => setProposeForm((p) => ({ ...p, description: e.target.value }))} rows={3} placeholder="Why is this important to discuss…" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white resize-none" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Estimated Duration (minutes)</label>
                <input type="number" min="1" max="180" value={proposeForm.duration_min} onChange={(e) => setProposeForm((p) => ({ ...p, duration_min: parseInt(e.target.value) || 15 }))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white" />
              </div>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowProposeAgenda(false)} className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={submitProposeAgenda} disabled={proposing} className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl disabled:opacity-50 flex items-center gap-2">
                {proposing ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Saving…</> : "Add to Agenda"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Task Modal */}
      {showAssignTask && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAssignTask(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-500 to-indigo-600">
              <h3 className="text-sm font-bold text-white">Assign Task from Meeting</h3>
              <p className="text-[11px] text-white/80 mt-0.5">The assignee will be notified immediately</p>
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
                  <DateField value={taskForm.start_date} onChange={(e) => setTaskForm((p) => ({ ...p, start_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-400 bg-white" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Deadline</label>
                <DateField value={taskForm.deadline} onChange={(e) => setTaskForm((p) => ({ ...p, deadline: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-400 bg-white" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Notes</label>
                <textarea value={taskForm.notes} onChange={(e) => setTaskForm((p) => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Additional context…" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-400 bg-white resize-none" />
              </div>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowAssignTask(false)} className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={submitAssignTask} disabled={assigningTask} className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50 flex items-center gap-2">
                {assigningTask ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Assigning…</> : "Assign Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
