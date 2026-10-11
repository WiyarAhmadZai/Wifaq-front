import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { get, post, put, del } from "../../api/axios";
import TaskCalendar from "./TaskCalendar";
import { DayDetailModal } from "./DayDetail";
import { DateField } from "./HrUI";
import RichTextField, { RichTextView } from "../RichTextField";
import { useResourcePermissions } from "../../admin/utils/useResourcePermissions";
import { useAuth } from "../../admin/context/AuthContext";

/**
 * One staff member's tasks on a month calendar. Shown on their profile and,
 * from the Staff Tasks list, in a pop-up. The server decides who may look
 * (admins/HR, the person's supervisors, the person) and who may ASSIGN from
 * here (`can_assign`: admins/HR and supervisors).
 *
 * Assigning is one or more tasks at once:
 *   "+ Add task" (Unplanned)  → no date; the person drags it onto a day
 *   "+" on a day              → fixed on that day (they cannot move it),
 *                               each task with an optional time
 */
export default function StaffTaskCalendar({ staffId, staffName = "", deniedText = null }) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [data, setData] = useState(null);
  const [denied, setDenied] = useState(false);
  const [adding, setAdding] = useState(null);   // { date: "YYYY-MM-DD" | null }
  const [open, setOpen] = useState(null);       // the task clicked on the calendar
  const [day, setDay] = useState(null);         // the day clicked, for the day view

  const load = useCallback(() => get("/hr/staff-tasks/staff-calendar", { cache: false, params: { staff_id: staffId, month } })
    .then((r) => setData(r.data))
    .catch((e) => { if (e.response?.status === 403) setDenied(true); }), [staffId, month]);
  useEffect(() => { load(); }, [load]);

  if (denied) return deniedText ? <p className="p-6 text-center text-sm text-gray-500">{deniedText}</p> : null;
  if (!data) return <div className="py-8 text-center text-xs text-gray-400">Loading…</div>;

  const shift = (by) => setMonth((m) => {
    const d = new Date(`${m}-01T00:00:00`);
    d.setMonth(d.getMonth() + by);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const s = data.summary;

  /* Optimistic: the card moves at once, the server confirms (or we reload). */
  const move = (t, date) => {
    setData((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === t.id ? { ...x, calendar_date: date, planned_date: date, ...(date ? {} : { planned_time: null, end_time: null }) } : x)) }));
    put(`/hr/staff-tasks/${t.id}/plan`, { planned_date: date, planned_time: date ? t.planned_time : null })
      .then(load)
      .catch((e) => { Swal.fire("Error", e.response?.data?.message || "Could not move the task.", "error"); load(); });
  };
  const reorder = (ids) => {
    setData((d) => ({ ...d, tasks: d.tasks.map((x) => (ids.includes(x.id) ? { ...x, sort_order: ids.indexOf(x.id) + 1 } : x)) }));
    put("/hr/staff-tasks/reorder", { ids }).catch((e) => { Swal.fire("Error", e.response?.data?.message || "Could not save the order.", "error"); load(); });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        {[["Open", s.open, "bg-sky-50 text-sky-700"], ["Completed", s.completed, "bg-emerald-50 text-emerald-700"],
          ["Overdue", s.overdue, "bg-red-50 text-red-700"], ["Unplanned", s.unplanned, "bg-amber-50 text-amber-700"]].map(([label, n, cls]) => (
          <span key={label} className={`px-2.5 py-1 rounded-lg font-semibold ${cls}`}><span>{label}</span> <b data-no-i18n>{n}</b></span>
        ))}
        {data.can_assign && (
          <span className="ms-auto text-[11px] text-gray-500">Click + on a day to assign a task on that date — or drag a task onto a day.</span>
        )}
      </div>
      <TaskCalendar
        tasks={data.tasks}
        month={month}
        onMonth={shift}
        // Drag and drop: the person moves their undated tasks; an admin or
        // supervisor moves any task, dated ones included.
        editable={!!data.can_arrange}
        lockFixed={!data.can_assign}
        confirmBusy={!!data.can_assign}
        onMove={move}
        onReorder={reorder}
        onAddDay={data.can_assign ? (date) => setAdding({ date }) : undefined}
        onAddUnplanned={data.can_assign ? () => setAdding({ date: null }) : undefined}
        onOpen={setOpen}
        onDayClick={setDay}
      />
      {open && (
        <TaskStatusModal task={open} canReport={!!data.can_report} canSupervise={!!data.can_supervise} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); load(); }} />
      )}
      {day && (
        <DayDetailModal staffId={staffId} staffName={staffName} date={day}
          onClose={() => setDay(null)} onOpenTask={setOpen} />
      )}
      {adding && (
        <QuickTaskModal staffId={staffId} staffName={staffName} date={adding.date}
          onClose={() => setAdding(null)} onSaved={() => { setAdding(null); load(); }} />
      )}
    </div>
  );
}

/** Rich text → its visible words, to tell a written task from an empty box. */
const plainText = (html) => {
  const el = document.createElement("div");
  el.innerHTML = html || "";
  return (el.textContent || "").trim();
};

/**
 * Add one or more tasks at once. The date (or none) comes from where it was
 * opened; each task may also get a time on that day — optional. `self` is the
 * person adding to their own calendar (My Tasks), which only changes wording.
 */
export function QuickTaskModal({ staffId, staffName, date, self = false, onClose, onSaved }) {
  const [rows, setRows] = useState([{ text: "", time: "", dh: "", dm: "" }]);
  const [busy, setBusy] = useState(false);
  const nice = date ? new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : null;
  // The text is rich (HTML); an editor left empty can still hold a stray <br>.
  const filled = rows.filter((r) => plainText(r.text));

  const setRow = (i, k, v) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const addRow = () => setRows((rs) => [...rs, { text: "", time: "", dh: "", dm: "" }]);
  const removeRow = (i) => setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : rs));

  const save = async () => {
    if (!filled.length) return;
    setBusy(true);
    let saved = 0;
    try {
      // One request per task: each can carry its own time and length.
      for (const r of filled) {
        const dur = (Number(r.dh) || 0) * 60 + (Number(r.dm) || 0);
        await post("/hr/staff-tasks", {
          staff_ids: [staffId],
          task: r.text,
          task_type: "normal",
          ...(date ? { start_date: date } : {}),
          ...(date && r.time ? { planned_time: r.time } : {}),
          ...(dur > 0 ? { duration_minutes: dur } : {}),
        });
        saved++;
      }
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: saved > 1 ? "Tasks added" : "Task added", timer: 1500, showConfirmButton: false });
      onSaved();
    } catch (e) {
      const errs = e.response?.data?.errors;
      Swal.fire("Error", errs ? Object.values(errs).flat().join("\n") : e.response?.data?.message || "Could not assign the task.", "error");
      // The ones already saved stay; show them.
      if (saved) onSaved();
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="text-xs text-gray-400">{self ? "Add tasks to my calendar" : "Assign tasks"}</div>
          <div className="font-semibold text-gray-800">
            {staffName && !self && <span data-no-i18n>{staffName} · </span>}
            {date ? <span data-no-i18n>{nice}</span> : <span className="text-amber-700">{self ? "No date — I choose the day later" : "No date — they choose the day"}</span>}
          </div>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto">
          {rows.map((r, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-2 w-5 h-5 shrink-0 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold flex items-center justify-center" data-no-i18n>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <RichTextField autoFocus={i === rows.length - 1} rows={3} value={r.text} onChange={(html) => setRow(i, "text", html)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save(); }}
                  placeholder="What needs to be done?" />
              </div>
              {date && (
                <div className="w-32 shrink-0">
                  <input type="time" value={r.time} onChange={(e) => setRow(i, "time", e.target.value)} title="Time (optional)"
                    className="w-full border border-gray-200 rounded-xl px-2 py-2 text-sm focus:ring-2 focus:ring-teal-200 outline-none" />
                  <div className="mt-1 flex gap-1">
                    <input type="number" min={0} max={23} value={r.dh} onChange={(e) => setRow(i, "dh", e.target.value)} title="Hours (optional)"
                      className="w-full min-w-0 border border-gray-200 rounded-xl px-1.5 py-1.5 text-sm text-center focus:ring-2 focus:ring-teal-200 outline-none" placeholder="h" data-no-i18n />
                    <input type="number" min={0} max={59} value={r.dm} onChange={(e) => setRow(i, "dm", e.target.value)} title="Minutes (optional)"
                      className="w-full min-w-0 border border-gray-200 rounded-xl px-1.5 py-1.5 text-sm text-center focus:ring-2 focus:ring-teal-200 outline-none" placeholder="min" data-no-i18n />
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5 text-center">Time · how long (optional)</div>
                </div>
              )}
              {rows.length > 1 && (
                <button onClick={() => removeRow(i)} title="Remove" aria-label="Remove"
                  className="mt-2 w-6 h-6 shrink-0 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">✕</button>
              )}
            </div>
          ))}
          <button onClick={addRow}
            className="w-full py-2 rounded-xl border border-dashed border-teal-300 text-teal-700 text-xs font-semibold hover:bg-teal-50">
            + Add another task
          </button>
          <p className="text-[11px] text-gray-400">
            {!date ? (self ? "It goes to your Unplanned list; drag it onto a day." : "It goes to their Unplanned list; they drag it onto a day.")
              : self ? "Several tasks can share a day. Give a time and how long it takes when it matters." : "Fixed on this day — they cannot move it."}
          </p>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
          <button onClick={save} disabled={busy || !filled.length}
            className="px-5 py-2 text-sm rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold disabled:opacity-50">
            {busy ? "Saving…" : self ? "Add" : "Assign"} {filled.length > 1 && <span data-no-i18n>({filled.length})</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Click a task on a calendar: read all of it, move its progress
 * and change its status. The time it starts and ends is
 * captured as that happens — the first move above zero is
 * the start, completing is the end — and the slot shows
 * the user as busy until then.
 *
 * Progress and status follow each other the way the server rule does:
 * above 0% the task is In Progress, at 100% it is Completed; choosing
 * Completed fills it to 100%, choosing Pending empties it.
 */
// Same colours as the calendar cards (TaskCalendar).
const TASK_STATUS = {
  pending:     { label: "Pending",     chip: "bg-amber-50 text-amber-700 border-amber-200" },
  in_progress: { label: "In Progress", chip: "bg-sky-50 text-sky-700 border-sky-200" },
  completed:   { label: "Completed",   chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled:   { label: "Cancelled",   chip: "bg-gray-100 text-gray-500 border-gray-200" },
};

const toMin = (hm) => { const [h, m] = String(hm || "").split(":"); return (Number(h) || 0) * 60 + (Number(m) || 0); };
const fmtDur = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`);
/** The current clock time, "HH:MM". */
const nowHm = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

export function TaskStatusModal({ task, onClose, onSaved, canReport = false, canSupervise = false }) {
  const navigate = useNavigate();
  const { user: authUser, isSuperAdmin, hasRole } = useAuth();
  useResourcePermissions("staff-task");
  // Edit / delete: an admin, the assignee's supervisor, or whoever
  // assigned the task (including assigning it to oneself). Every role
  // holds staff-task.* permissions, so the gate is the relationship,
  // not the permission.
  const canManage = isSuperAdmin || hasRole('admin') || hasRole('hr-manager')
    || canSupervise
    || Number(task.assigned_by_id ?? 0) === Number(authUser?.id);
  const startProgress = task.status === "completed" ? 100 : Number(task.progress || 0);
  const [status, setStatus] = useState(task.status);
  const [progress, setProgress] = useState(startProgress);
  // The slot the task holds on its planned day: when the
  // work starts and when it ends. Both are captured
  // automatically — the moment the progress first moves
  // above zero is the start, and completing the task is
  // the end. A time set in advance (when the task was
  // assigned) is kept as the planned start.
  const [start, setStart] = useState(task.planned_time || "");
  const [end, setEnd] = useState(task.end_time || "");
  // The assignee's response on the task — their own words
  // on how the work went: completed, modified, blocked.
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const locked = task.status === "cancelled" && status === "cancelled";

  /* The slot is captured as the work happens: the first
     move above zero stamps the start, completing stamps
     the end, and reopening the task opens the slot again.
     A time set in advance stays the planned start. */
  const onProgress = (v) => {
    const p = Math.max(0, Math.min(100, Number(v) || 0));
    const wasCompleted = status === "completed";
    setProgress(p);
    if (p >= 100) {
      setStatus("completed");
      if (!start) setStart(nowHm());
      if (!wasCompleted) setEnd(nowHm());
    } else if (p > 0) {
      setStatus("in_progress");
      if (!start) setStart(nowHm());
      if (wasCompleted) setEnd("");
    } else {
      setStatus("pending");
      if (wasCompleted) setEnd("");
    }
  };
  const onStatus = (k) => {
    const wasCompleted = status === "completed";
    setStatus(k);
    if (k === "completed") {
      setProgress(100);
      if (!start) setStart(nowHm());
      if (!wasCompleted) setEnd(nowHm());
    } else if (k === "pending") {
      setProgress(0);
      if (wasCompleted) setEnd("");
    } else {
      if (progress >= 100) setProgress(95);
      if (!start) setStart(nowHm());
      if (wasCompleted) setEnd("");
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const patch = {};
      if (progress !== startProgress) patch.progress = progress;
      if (status !== task.status) patch.status = status;
      if (comment.trim()) patch.update_text = comment.trim();
      if (Object.keys(patch).length) await put(`/hr/staff-tasks/${task.id}`, patch);
      const durTotal = start && end ? Math.max(0, toMin(end) - toMin(start)) : 0;
      const slotChanged = (start || null) !== (task.planned_time || null)
        || (end || null) !== (task.end_time || null)
        || (durTotal || null) !== (Number(task.duration_minutes ?? 0) || null);
      if (task.planned_date && slotChanged) {
        await put(`/hr/staff-tasks/${task.id}/plan`, {
          planned_date: task.planned_date,
          planned_time: start || null,
          duration_minutes: durTotal > 0 ? durTotal : null,
          end_time: start && end ? end : null,
        });
      }
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Saved", timer: 1200, showConfirmButton: false });
      onSaved();
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not save.", "error");
    } finally { setBusy(false); }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: "Delete task?",
      text: "This cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;
    try {
      await del(`/hr/staff-tasks/${task.id}`);
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Task deleted", timer: 1200, showConfirmButton: false });
      onSaved();
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not delete the task.", "error");
    }
  };

  const details = task.details && task.details.trim() ? task.details : null;

  return (
    <>
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-xs text-gray-400">Task</div>
            <div className="font-semibold text-gray-800 break-words" dir="auto" data-no-i18n>{task.task}</div>
            <div className="text-[11px] text-gray-400 mt-0.5 flex flex-wrap gap-x-3">
              {task.assigned_by && <span><span>Assigned by</span> <span data-no-i18n>{task.assigned_by}</span></span>}
              {task.deadline && <span><span>Deadline</span> <span data-no-i18n>{task.deadline}</span></span>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          {/* The whole task, however long — it scrolls inside the pop-up. */}
          {details && (
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 max-h-64 overflow-y-auto" data-no-i18n>
              <RichTextView html={details} className="text-sm text-gray-700 leading-relaxed break-words [overflow-wrap:anywhere]" />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Progress</span>
              <span className={`text-sm font-bold ${progress >= 100 ? "text-emerald-600" : "text-teal-700"}`} data-no-i18n>{progress}%</span>
            </div>
            <input type="range" min={0} max={100} step={5} value={progress} disabled={locked}
              onChange={(e) => onProgress(e.target.value)}
              className="w-full accent-teal-600 disabled:opacity-40" aria-label="Progress" />
            <div className="mt-2 flex gap-1.5">
              {[0, 25, 50, 75, 100].map((p) => (
                <button key={p} type="button" disabled={locked} onClick={() => onProgress(p)}
                  className={`flex-1 rounded-lg border py-1 text-[11px] font-semibold disabled:opacity-40 ${progress === p ? "border-teal-500 bg-teal-50 text-teal-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                  data-no-i18n>{p}%</button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-gray-400">Above 0% the task is In Progress; at 100% it is Completed.</p>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Status</div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(TASK_STATUS).map(([k, s]) => (
                <button key={k} type="button" onClick={() => onStatus(k)}
                  className={`rounded-xl border-2 px-2 py-2 text-xs font-semibold ${status === k ? `${s.chip} border-current` : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>{s.label}</button>
              ))}
            </div>
          </div>

          {/* Respond — the assignee's own words on how the work went. */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Respond / comment</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
              placeholder="Completed, modified, blocked… — what happened with this task?"
              className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-teal-200 outline-none" />
            {task.last_update && (
              <p className="mt-1.5 text-[11px] text-gray-500 bg-gray-50 rounded-lg px-2.5 py-2" dir="auto" data-no-i18n>{task.last_update}</p>
            )}
          </div>

          {task.planned_date && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
                <span>Time on</span> <span data-no-i18n>{task.planned_date}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {start ? (
                  <span className="text-sm font-semibold text-gray-800" data-no-i18n>
                    {start}{end ? ` – ${end}` : status === "in_progress" ? " – …" : ""}
                  </span>
                ) : (
                  <span className="text-[11px] text-gray-400">No time set — captured when the work starts</span>
                )}
                {start && end && (() => { const d = toMin(end) - toMin(start); return d > 0 ? <span className="text-[11px] text-gray-400" data-no-i18n>({fmtDur(d)})</span> : null; })()}
                {start && !end && status === "in_progress" && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 rounded px-1.5 py-0.5">Busy now</span>
                )}
              </div>
              <p className="mt-1.5 text-[10px] text-gray-400">The slot is taken when the task starts and filled when it is completed — until then you show as busy.</p>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-2">
          <span className="flex items-center gap-3">
            <button onClick={() => navigate(`/hr/staff-task/show/${task.id}`)} className="text-xs font-semibold text-teal-700 hover:underline">Open task →</button>
            {canManage && (
              <button onClick={() => setEditing(true)} className="text-xs font-semibold text-teal-700 hover:underline">Edit</button>
            )}
            {canManage && (
              <button onClick={handleDelete} className="text-xs font-semibold text-red-600 hover:underline">Delete</button>
            )}
            {canReport && (
              <button onClick={() => setReportOpen(true)} className="text-xs font-semibold text-teal-700 hover:underline">
                {task.report ? "Update report" : "Report back"}
              </button>
            )}
          </span>
          <span className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button onClick={save} disabled={busy} className="px-4 py-2 text-sm rounded-xl bg-teal-600 text-white font-semibold disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
          </span>
        </div>
      </div>
    </div>

    {reportOpen && (
      <TaskReportModal task={task} onClose={() => setReportOpen(false)}
        onSaved={() => { setReportOpen(false); onSaved(); }} />
    )}

    {editing && (
      <TaskEditModal task={task} onClose={() => setEditing(false)}
        onSaved={() => { setEditing(false); onSaved(); }} />
    )}
    </>
  );
}

/**
 * Edit a task in place — the same fields as the edit page
 * (StaffTaskForm), in a pop-up over the task pop-up, so the
 * calendar never has to be left. Saving updates the task and
 * reloads the calendar through `onSaved`.
 */
const TASK_TYPES = [
  { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-700" },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-700" },
  { value: "normal", label: "Normal", color: "bg-blue-100 text-blue-700" },
  { value: "low", label: "Low", color: "bg-gray-100 text-gray-600" },
];

const inp = "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none transition-colors placeholder-gray-400";

export function TaskEditModal({ task, onClose, onSaved }) {
  const dropdownRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    staff_id: "", title: "", task: "", task_type: "normal",
    start_date: "", deadline: "", no_date: false,
    recurrence: "", recurrence_until: "",
    estimate_value: "", estimate_unit: "hours", notes: "",
  });
  const [staffList, setStaffList] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [t, list] = await Promise.all([
          get(`/hr/staff-tasks/${task.id}`),
          get("/hr/staff-tasks/staff-list"),
        ]);
        if (!alive) return;
        const d = t.data;
        setForm({
          staff_id: d.staff_id || "",
          title: d.title || "",
          task: d.task || "",
          task_type: d.task_type || "normal",
          start_date: d.start_date?.split("T")[0] || "",
          deadline: d.deadline?.split("T")[0] || "",
          no_date: !d.start_date,
          recurrence: d.recurrence || "",
          recurrence_until: d.recurrence_until?.split("T")[0] || "",
          estimate_value: d.estimated_minutes ? String(Math.round((d.estimated_minutes / 60) * 100) / 100) : "",
          estimate_unit: "hours",
          notes: d.notes || "",
        });
        if (d.staff) {
          setSelectedStaff({
            id: d.staff.id,
            full_name: d.staff.application?.full_name || d.staff_name,
            employee_id: d.staff.employee_id || "",
            department: d.staff.department || "",
            role_title: d.staff.role_title_en || "",
          });
        }
        const data = list.data?.data || [];
        setStaffList(Array.isArray(data) ? data : []);
        setFilteredStaff(Array.isArray(data) ? data : []);
      } catch {
        Swal.fire("Error", "Could not load the task.", "error");
        onClose();
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  useEffect(() => {
    const close = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    const q = searchTerm.toLowerCase();
    setFilteredStaff(q
      ? staffList.filter((s) => s.full_name?.toLowerCase().includes(q) || s.employee_id?.toLowerCase().includes(q))
      : staffList);
  }, [searchTerm, staffList]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.staff_id) { Swal.fire("Error", "Please select a staff member.", "error"); return; }
    if (!plainText(form.task)) { Swal.fire("Missing", "Please describe the task.", "warning"); return; }
    setSaving(true);
    try {
      const data = { ...form };
      delete data.no_date;
      delete data.estimate_value;
      delete data.estimate_unit;
      if (!data.start_date) data.start_date = null;
      if (!data.deadline) delete data.deadline;
      if (!data.recurrence) { data.recurrence = null; data.recurrence_until = null; }
      if (!data.recurrence_until) delete data.recurrence_until;
      const perUnit = { minutes: 1, hours: 60, days: 480 }[form.estimate_unit] || 60;
      const est = Number(form.estimate_value);
      if (est > 0) data.estimated_minutes = Math.round(est * perUnit);
      await put(`/hr/staff-tasks/${task.id}`, data);
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Task updated", timer: 1500, showConfirmButton: false });
      onSaved();
    } catch (e) {
      const errs = e.response?.data?.errors;
      Swal.fire("Error", errs ? Object.values(errs).flat().join("\n") : e.response?.data?.message || "Could not save the task.", "error");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-xs text-gray-400">Edit task</div>
            <div className="font-semibold text-gray-800 break-words" dir="auto" data-no-i18n>
              {plainText(form.task) || task.task}
            </div>
            {selectedStaff && (
              <div className="text-[11px] text-gray-400 mt-0.5" data-no-i18n>
                {selectedStaff.full_name}{selectedStaff.employee_id ? ` · ${selectedStaff.employee_id}` : ""}
              </div>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Who it is for */}
              <div className="relative" ref={dropdownRef}>
                <label className="block text-xs font-medium text-gray-700 mb-1">Staff member</label>
                <input type="text" value={searchTerm || (selectedStaff ? `${selectedStaff.full_name} (${selectedStaff.employee_id})` : "")}
                  placeholder="Search staff by name or ID…"
                  onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                  onFocus={() => { setShowDropdown(true); if (selectedStaff) setSearchTerm(""); }}
                  className={inp} />
                {showDropdown && (
                  <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-auto">
                    {filteredStaff.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-400">No staff found</div>
                    ) : filteredStaff.map((s) => (
                      <div key={s.id} onClick={() => { setSelectedStaff(s); set("staff_id", s.id); setSearchTerm(""); setShowDropdown(false); }}
                        className={`px-4 py-2.5 cursor-pointer hover:bg-teal-50 border-b border-gray-50 last:border-0 ${form.staff_id === s.id ? "bg-teal-50" : ""}`}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600 text-xs font-bold shrink-0" data-no-i18n>{s.full_name?.charAt(0)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-800 truncate" data-no-i18n>{s.full_name}</div>
                            <div className="text-[10px] text-gray-500" data-no-i18n>{s.employee_id}{s.department ? ` · ${s.department}` : ""}{s.role_title ? ` · ${s.role_title}` : ""}</div>
                          </div>
                          {form.staff_id === s.id && (
                            <svg className="w-4 h-4 text-teal-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Task type</label>
                <div className="flex gap-2">
                  {TASK_TYPES.map((t) => (
                    <button key={t.value} type="button" onClick={() => set("task_type", t.value)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border-2 ${form.task_type === t.value ? `${t.color} border-current` : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-gray-700">Start date</label>
                    <label className="flex items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer select-none">
                      <input type="checkbox" checked={form.no_date}
                        onChange={(e) => setForm((f) => ({ ...f, no_date: e.target.checked, ...(e.target.checked ? { recurrence: "" } : {}) }))}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                      <span>No date — they choose</span>
                    </label>
                  </div>
                  {form.no_date
                    ? <p className="px-3.5 py-2.5 rounded-xl border border-dashed border-amber-300 bg-amber-50 text-[11px] text-amber-800">It goes to their Inbox. They drag it onto a day on My Tasks.</p>
                    : <DateField name="start_date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} className={inp} />}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Deadline <span className="text-gray-400 font-normal">(optional)</span></label>
                  <DateField name="deadline" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} className={inp} />
                </div>
              </div>

              {/* Repeat */}
              {!form.no_date && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Repeat</label>
                    <select value={form.recurrence} onChange={(e) => set("recurrence", e.target.value)} className={inp}>
                      <option value="">Does not repeat</option>
                      <option value="daily">Every day</option>
                      <option value="weekly">Every week</option>
                      <option value="monthly">Every month</option>
                    </select>
                  </div>
                  {form.recurrence && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Repeat until <span className="text-gray-400 font-normal">(optional)</span></label>
                      <DateField name="recurrence_until" value={form.recurrence_until} onChange={(e) => set("recurrence_until", e.target.value)} className={inp} />
                    </div>
                  )}
                </div>
              )}

              {/* Estimated time */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Estimated time <span className="text-gray-400 font-normal">(optional)</span></label>
                <div className="flex gap-2">
                  <input type="number" min="0" step="0.5" value={form.estimate_value} onChange={(e) => set("estimate_value", e.target.value)} placeholder="3" className={`${inp} flex-1 min-w-0`} />
                  <select value={form.estimate_unit} onChange={(e) => set("estimate_unit", e.target.value)} className={`${inp} basis-32 grow-0 shrink-0`}>
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Task title <span className="text-gray-400 font-normal">(short subject)</span></label>
                <input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={200} dir="auto"
                  placeholder="e.g. Prepare the monthly report" className={inp} />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Task description</label>
                <RichTextField value={form.task} onChange={(html) => set("task", html)} rows={5}
                  placeholder="Describe the task — use the toolbar for bullet points and numbering" />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <RichTextField value={form.notes} onChange={(html) => set("notes", html)} rows={3} placeholder="Any additional notes…" />
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
          <button onClick={save} disabled={saving || loading}
            className="px-4 py-2 text-sm rounded-xl bg-teal-600 text-white font-semibold disabled:opacity-50">
            {saving ? "Saving…" : "Update task"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The assignee's report back on a task: what they did, found or
 * finished. Rich text; saving overwrites the previous report (the
 * latest is what the assigner reads) and notifies the assigner.
 */
export function TaskReportModal({ task, onClose, onSaved }) {
  const [text, setText] = useState(task.report || "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!plainText(text)) {
      Swal.fire("Missing", "Please write the report first.", "warning");
      return;
    }
    setBusy(true);
    try {
      await post(`/hr/staff-tasks/${task.id}/report`, { report: text });
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Report saved", timer: 1200, showConfirmButton: false });
      onSaved();
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not save the report.", "error");
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-xs text-gray-400">Report back</div>
            <div className="font-semibold text-gray-800 break-words" dir="auto" data-no-i18n>{task.task}</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {task.report && (
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 max-h-40 overflow-y-auto">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Current report</div>
              <RichTextView html={task.report} className="text-sm text-gray-700 leading-relaxed break-words [overflow-wrap:anywhere]" />
            </div>
          )}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Your report</div>
            <RichTextField value={text} onChange={setText} rows={7}
              placeholder="What did you do? What did you find? What is finished, and what is left?" />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
          <button onClick={save} disabled={busy} className="px-4 py-2 text-sm rounded-xl bg-teal-600 text-white font-semibold disabled:opacity-50">{busy ? "Saving…" : "Save report"}</button>
        </div>
      </div>
    </div>
  );
}
