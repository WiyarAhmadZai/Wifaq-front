import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { get, post, put } from "../../api/axios";
import TaskCalendar from "./TaskCalendar";
import RichTextField, { RichTextView } from "../RichTextField";

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
    setData((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === t.id ? { ...x, calendar_date: date, planned_date: date } : x)) }));
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
      />
      {open && (
        <TaskStatusModal task={open} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); load(); }} />
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
  const [rows, setRows] = useState([{ text: "", time: "" }]);
  const [busy, setBusy] = useState(false);
  const nice = date ? new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : null;
  // The text is rich (HTML); an editor left empty can still hold a stray <br>.
  const filled = rows.filter((r) => plainText(r.text));

  const setRow = (i, k, v) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const addRow = () => setRows((rs) => [...rs, { text: "", time: "" }]);
  const removeRow = (i) => setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : rs));

  const save = async () => {
    if (!filled.length) return;
    setBusy(true);
    let saved = 0;
    try {
      // One request per task: each can carry its own time.
      for (const r of filled) {
        await post("/hr/staff-tasks", {
          staff_ids: [staffId],
          task: r.text,
          task_type: "normal",
          ...(date ? { start_date: date } : {}),
          ...(date && r.time ? { planned_time: r.time } : {}),
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
                <div className="w-28 shrink-0">
                  <input type="time" value={r.time} onChange={(e) => setRow(i, "time", e.target.value)} title="Time (optional)"
                    className="w-full border border-gray-200 rounded-xl px-2 py-2 text-sm focus:ring-2 focus:ring-teal-200 outline-none" />
                  <div className="text-[10px] text-gray-400 mt-0.5 text-center">Time (optional)</div>
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
              : self ? "Several tasks can share a day. Give a time if it matters." : "Fixed on this day — they cannot move it."}
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
 * Click a task on a calendar: read all of it, move its progress, change its
 * status or its time — or open the full task.
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

export function TaskStatusModal({ task, onClose, onSaved }) {
  const navigate = useNavigate();
  const startProgress = task.status === "completed" ? 100 : Number(task.progress || 0);
  const [status, setStatus] = useState(task.status);
  const [progress, setProgress] = useState(startProgress);
  const [time, setTime] = useState(task.planned_time || "");
  const [busy, setBusy] = useState(false);
  const locked = task.status === "cancelled" && status === "cancelled";

  const onProgress = (v) => {
    const p = Math.max(0, Math.min(100, Number(v) || 0));
    setProgress(p);
    if (p >= 100) setStatus("completed");
    else if (p > 0) setStatus("in_progress");
    else setStatus("pending");
  };
  const onStatus = (k) => {
    setStatus(k);
    if (k === "completed") setProgress(100);
    else if (k === "pending") setProgress(0);
    else if (k === "in_progress" && progress >= 100) setProgress(95);
  };

  const save = async () => {
    setBusy(true);
    try {
      const patch = {};
      if (progress !== startProgress) patch.progress = progress;
      if (status !== task.status) patch.status = status;
      if (Object.keys(patch).length) await put(`/hr/staff-tasks/${task.id}`, patch);
      if (task.planned_date && (time || null) !== (task.planned_time || null)) {
        await put(`/hr/staff-tasks/${task.id}/plan`, { planned_date: task.planned_date, planned_time: time || null });
      }
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Saved", timer: 1200, showConfirmButton: false });
      onSaved();
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not save.", "error");
    } finally { setBusy(false); }
  };

  const details = task.details && task.details.trim() ? task.details : null;

  return (
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

          {task.planned_date && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1"><span>Time on</span> <span data-no-i18n>{task.planned_date}</span></div>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-2">
          <button onClick={() => navigate(`/hr/staff-task/show/${task.id}`)} className="text-xs font-semibold text-teal-700 hover:underline">Open task →</button>
          <span className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button onClick={save} disabled={busy} className="px-4 py-2 text-sm rounded-xl bg-teal-600 text-white font-semibold disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
          </span>
        </div>
      </div>
    </div>
  );
}
