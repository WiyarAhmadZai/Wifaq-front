import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { get, post, put } from "../../api/axios";
import TaskCalendar from "./TaskCalendar";

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
      />
      {adding && (
        <QuickTaskModal staffId={staffId} staffName={staffName} date={adding.date}
          onClose={() => setAdding(null)} onSaved={() => { setAdding(null); load(); }} />
      )}
    </div>
  );
}

/**
 * Add one or more tasks at once. The date (or none) comes from where it was
 * opened; each task may also get a time on that day — optional. `self` is the
 * person adding to their own calendar (My Tasks), which only changes wording.
 */
export function QuickTaskModal({ staffId, staffName, date, self = false, onClose, onSaved }) {
  const [rows, setRows] = useState([{ text: "", time: "" }]);
  const [busy, setBusy] = useState(false);
  const nice = date ? new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : null;
  const filled = rows.filter((r) => r.text.trim());

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
          task: r.text.trim(),
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
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
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
              <textarea autoFocus={i === rows.length - 1} rows={2} value={r.text} onChange={(e) => setRow(i, "text", e.target.value)} dir="auto"
                onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save(); }}
                placeholder="What needs to be done?"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-200 outline-none" />
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
