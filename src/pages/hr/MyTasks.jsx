import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { get, put, post, del } from "../../api/axios";
import { PageHeader, Spinner } from "../../components/hr/HrUI";
import TaskCalendar from "../../components/hr/TaskCalendar";
import StaffTaskCalendar, { QuickTaskModal, TaskStatusModal } from "../../components/hr/StaffTaskCalendar";
import { DayDetailModal } from "../../components/hr/DayDetail";

/**
 * My Tasks.
 *
 * "My calendar": the month calendar, where a task can be dragged onto a
 * day, onto another task to order the day, or back to Unplanned.
 * "Assigned by me": the tasks I gave other people, and where each one
 * stands.
 * "My timeline": what I work on today, from when to when. Those hours are
 * mine — nobody else can assign me a task in them, and the appointment
 * calendar shows me as busy.
 *
 * Every day or status change also reaches the super-admin (server side).
 */

const STATUS = {
  pending:     { label: "Pending",     chip: "bg-amber-50 text-amber-700 border-amber-200" },
  in_progress: { label: "In Progress", chip: "bg-sky-50 text-sky-700 border-sky-200" },
  completed:   { label: "Completed",   chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled:   { label: "Cancelled",   chip: "bg-gray-100 text-gray-500 border-gray-200" },
};

const thisMonth = () => new Date().toISOString().slice(0, 7);
const shiftMonth = (m, by) => {
  const d = new Date(`${m}-01T00:00:00`);
  d.setMonth(d.getMonth() + by);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function MyTasks() {
  const navigate = useNavigate();
  // "mine" is the calendar.
  const [tab, setTab] = useState("mine");
  const [month, setMonth] = useState(thisMonth());
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);   // the task whose status is being changed
  const [calendarFor, setCalendarFor] = useState(null); // { id, name } — an assignee's calendar
  const [adding, setAdding] = useState(null);           // { date } — adding tasks to my own calendar
  const [day, setDay] = useState(null);                 // the day clicked, for the day view

  const load = useCallback(() => get("/hr/staff-tasks/my-tasks", { cache: false, params: { month } })
    .then((r) => setData(r.data))
    .catch(() => Swal.fire("Error", "Could not load your tasks.", "error")), [month]);
  useEffect(() => { load(); }, [load]);

  const fail = (e, text) => Swal.fire("Error", e.response?.data?.message || text, "error");

  /* Optimistic: the card moves at once; the server confirms (or we reload). */
  const patchTask = (id, fields) => setData((d) => d && ({ ...d, mine: d.mine.map((t) => (t.id === id ? { ...t, ...fields } : t)) }));

  const move = (t, date) => {
    patchTask(t.id, { calendar_date: date, planned_date: date, ...(date ? {} : { planned_time: null, end_time: null }) });
    put(`/hr/staff-tasks/${t.id}/plan`, { planned_date: date, planned_time: date ? t.planned_time : null })
      .catch((e) => { fail(e, "Could not move the task."); load(); });
  };
  const reorder = (ids) => {
    setData((d) => d && ({ ...d, mine: d.mine.map((t) => (ids.includes(t.id) ? { ...t, sort_order: ids.indexOf(t.id) + 1 } : t)) }));
    put("/hr/staff-tasks/reorder", { ids }).catch((e) => { fail(e, "Could not save the order."); load(); });
  };

  if (!data) return <div className="flex justify-center py-24"><Spinner /></div>;

  const openCount = data.mine.filter((t) => !["completed", "cancelled"].includes(t.status)).length;

  return (
    <div className="px-4 py-5 space-y-4">
      <PageHeader title="My Tasks" subtitle="Drag a task onto a day to plan it — today is highlighted"
        icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />

      <div className="flex rounded-xl overflow-hidden border border-gray-200 text-xs w-fit bg-white">
        {[["mine", "My calendar", openCount], ["byme", "Assigned by me", data.assigned_by_me.length], ["timeline", "My timeline", null]].map(([k, label, n]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 font-semibold flex items-center gap-2 ${tab === k ? "bg-teal-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}>
            <span>{label}</span>
            {n != null && <span className={`px-1.5 rounded-full text-[10px] ${tab === k ? "bg-white/25" : "bg-gray-100"}`} data-no-i18n>{n}</span>}
          </button>
        ))}
      </div>

      {tab === "timeline" ? (
        <MyTimeline />
      ) : tab === "mine" ? (
        <TaskCalendar
          tasks={data.mine}
          month={month}
          onMonth={(by) => setMonth((m) => shiftMonth(m, by))}
          editable
          onMove={move}
          onReorder={reorder}
          onOpen={setOpen}
          onDayClick={setDay}
          scrollToToday
          // Anyone may add tasks to their own day — several, each with an optional time.
          onAddDay={data.my_staff_id ? (date) => setAdding({ date }) : undefined}
          onAddUnplanned={data.my_staff_id ? () => setAdding({ date: null }) : undefined}
        />
      ) : (
        <AssignedByMe rows={data.assigned_by_me} onOpen={(t) => navigate(`/hr/staff-task/show/${t.id}`)}
          onCalendar={(t) => setCalendarFor({ id: t.staff_id, name: t.assignee })}
          onEdit={(t) => navigate(`/hr/staff-task/edit/${t.id}`)} />
      )}

      {calendarFor && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => { setCalendarFor(null); load(); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400">Task calendar — drag a task to a free day</div>
                <div className="font-semibold text-gray-800" data-no-i18n>{calendarFor.name}</div>
              </div>
              <button onClick={() => { setCalendarFor(null); load(); }} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <div className="p-4"><StaffTaskCalendar staffId={calendarFor.id} staffName={calendarFor.name} /></div>
          </div>
        </div>
      )}

      {adding && (
        <QuickTaskModal self staffId={data.my_staff_id} date={adding.date}
          onClose={() => setAdding(null)} onSaved={() => { setAdding(null); load(); }} />
      )}

      {open && (
        <TaskStatusModal task={open} canReport onClose={() => setOpen(null)}
          onSaved={() => { setOpen(null); load(); }} />
      )}

      {day && data.my_staff_id && (
        <DayDetailModal staffId={data.my_staff_id} staffName="Me" date={day}
          onClose={() => setDay(null)} onOpenTask={setOpen} />
      )}
    </div>
  );
}

/* ── My timeline ──────────────────────────────────────────────────────── */

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const shiftDay = (date, by) => {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + by);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const hm = (mins) => {
  const h = Math.floor((mins || 0) / 60);
  const m = (mins || 0) % 60;
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`;
};
const toMin = (t) => { const [h, m] = String(t || "").split(":"); return (Number(h) || 0) * 60 + (Number(m) || 0); };

/* What else already holds the day (from the appointment calendar). */
const OTHER_KIND = {
  lesson: "Teaching", unavailable: "Unavailable", meeting: "Meeting", appointment: "Appointment",
  event: "Event", task: "Task", leave: "On leave", holiday: "Holiday",
};

const EMPTY_BLOCK = { start: "", end: "", title: "", project: "", notes: "" };

/**
 * Each person lays out their own day: which work or project, from when to
 * when, and how many hours that comes to. While a block lasts nobody else
 * can assign them a task, and booking an appointment shows them as busy.
 */
function MyTimeline() {
  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState(null);
  const [form, setForm] = useState(EMPTY_BLOCK);
  const [editing, setEditing] = useState(null); // id of the block being edited
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => get("/hr/staff-tasks/timeline", { cache: false, params: { date } })
    .then((r) => setData(r.data.data))
    .catch(() => Swal.fire("Error", "Could not load your timeline.", "error")), [date]);
  useEffect(() => { setData(null); load(); }, [load]);

  const fail = (e, text) => {
    const errs = e.response?.data?.errors;
    Swal.fire("Error", errs ? Object.values(errs).flat().join("\n") : e.response?.data?.message || text, "error");
  };

  const reset = () => { setForm(EMPTY_BLOCK); setEditing(null); };

  const save = (ev) => {
    ev.preventDefault();
    setSaving(true);
    const body = { ...form, date };
    const req = editing ? put(`/hr/staff-tasks/timeline/${editing}`, body) : post("/hr/staff-tasks/timeline", body);
    req.then(() => { reset(); load(); })
      .catch((e) => fail(e, "Could not save."))
      .finally(() => setSaving(false));
  };

  const edit = (b) => {
    setEditing(b.id);
    setForm({ start: b.start, end: b.end, title: b.title || "", project: b.project || "", notes: b.notes || "" });
  };

  const remove = async (b) => {
    const ok = await Swal.fire({ title: "Delete this block?", icon: "warning", showCancelButton: true, confirmButtonText: "Delete", cancelButtonText: "Cancel", confirmButtonColor: "#dc2626" });
    if (!ok.isConfirmed) return;
    del(`/hr/staff-tasks/timeline/${b.id}`).then(() => { if (editing === b.id) reset(); load(); })
      .catch((e) => fail(e, "Could not delete."));
  };

  const isToday = date === todayStr();
  const nice = new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const formMinutes = form.start && form.end && form.end > form.start ? toMin(form.end) - toMin(form.start) : 0;

  // The day strip: office hours, widened to whatever the blocks reach.
  const blocks = data?.entries || [];
  const others = data?.others || [];
  const dayStart = Math.min(toMin("06:00"), ...blocks.map((b) => toMin(b.start)), ...others.map((b) => toMin(b.start)));
  const dayEnd = Math.max(toMin("17:00"), ...blocks.map((b) => toMin(b.end)), ...others.map((b) => toMin(b.end)));
  const pos = (s, e) => ({
    insetInlineStart: `${((toMin(s) - dayStart) / (dayEnd - dayStart)) * 100}%`,
    width: `${Math.max(0.8, ((toMin(e) - toMin(s)) / (dayEnd - dayStart)) * 100)}%`,
  });
  const hours = [];
  for (let h = Math.ceil(dayStart / 60); h <= Math.floor(dayEnd / 60); h++) hours.push(h);
  const projects = [...new Set(blocks.map((b) => b.project).filter(Boolean))];

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setDate((d) => shiftDay(d, -1))} className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs" title="Previous day">‹</button>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs" />
          <button onClick={() => setDate((d) => shiftDay(d, 1))} className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs" title="Next day">›</button>
          {!isToday && <button onClick={() => setDate(todayStr())} className="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 text-xs font-semibold hover:bg-teal-100">Today</button>}
          <span className="text-sm font-semibold text-gray-800 ms-1" data-no-i18n>{nice}</span>
          {data && (
            <span className="ms-auto px-3 py-1 rounded-full bg-teal-600 text-white text-xs font-semibold">
              <span>Total</span> <span data-no-i18n>{hm(data.total_minutes)}</span>
            </span>
          )}
        </div>

        <p className="text-[11px] text-gray-500">While a block on your timeline lasts, nobody else can assign you a task, and the appointment calendar shows you as busy.</p>

        {!data ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : !data.my_staff_id ? (
          <p className="text-xs text-gray-500 py-6 text-center">Your account is not linked to a staff record.</p>
        ) : (
          <>
            {/* The day at a glance */}
            <div>
              <div className="relative h-12 rounded-lg bg-gray-50 border border-gray-200 overflow-hidden">
                {others.map((b, i) => (
                  <div key={`o${i}`} className="absolute top-0 h-4 bg-gray-300/70 border-x border-white" style={pos(b.start, b.end)}
                    title={`${OTHER_KIND[b.kind] || b.kind} ${b.start}–${b.end}`} />
                ))}
                {blocks.map((b) => (
                  <button key={b.id} type="button" onClick={() => edit(b)}
                    className={`absolute top-4 bottom-0 rounded-md border text-[10px] px-1 truncate text-start ${editing === b.id ? "bg-amber-400 border-amber-500 text-white" : "bg-teal-500 border-teal-600 text-white hover:bg-teal-600"}`}
                    style={pos(b.start, b.end)} title={`${b.start}–${b.end} ${b.title}`} dir="auto" data-no-i18n>{b.title}</button>
                ))}
              </div>
              <div className="relative h-4 text-[9px] text-gray-400" data-no-i18n>
                {hours.map((h) => (
                  <span key={h} className="absolute -translate-x-1/2 rtl:translate-x-1/2" style={{ insetInlineStart: `${((h * 60 - dayStart) / (dayEnd - dayStart)) * 100}%` }}>{String(h).padStart(2, "0")}</span>
                ))}
              </div>
              {others.length > 0 && <p className="text-[10px] text-gray-400 mt-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-gray-300 align-middle me-1" />Already on your day (lessons, meetings, tasks…)</p>}
            </div>

            {/* Add / edit a block */}
            <form onSubmit={save} className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-end rounded-lg bg-teal-50/50 border border-teal-100 p-3">
              <label className="sm:col-span-2 text-[11px] text-gray-600">From
                <input type="time" required value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })}
                  className="mt-0.5 w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs bg-white" />
              </label>
              <label className="sm:col-span-2 text-[11px] text-gray-600">To
                <input type="time" required value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })}
                  className="mt-0.5 w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs bg-white" />
              </label>
              <label className="col-span-2 sm:col-span-4 text-[11px] text-gray-600">What are you working on?
                <input required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} dir="auto"
                  className="mt-0.5 w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs bg-white" />
              </label>
              <label className="col-span-2 sm:col-span-2 text-[11px] text-gray-600">Project (optional)
                <input maxLength={150} list="timeline-projects" value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} dir="auto"
                  className="mt-0.5 w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs bg-white" />
                <datalist id="timeline-projects">{projects.map((p) => <option key={p} value={p} />)}</datalist>
              </label>
              <div className="col-span-2 sm:col-span-2 flex gap-1.5">
                <button disabled={saving} className="flex-1 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 disabled:opacity-50">
                  {editing ? "Save" : "Add"}
                </button>
                {editing && <button type="button" onClick={reset} className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs bg-white">Cancel</button>}
              </div>
              <label className="col-span-2 sm:col-span-12 text-[11px] text-gray-600">Notes (optional)
                <input maxLength={2000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} dir="auto"
                  className="mt-0.5 w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs bg-white" />
              </label>
              {formMinutes > 0 && <p className="col-span-2 sm:col-span-12 text-[11px] text-teal-700"><span>Length:</span> <span data-no-i18n>{hm(formMinutes)}</span></p>}
            </form>

            {/* The blocks, in order */}
            {blocks.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Nothing on your timeline for this day yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                {blocks.map((b) => (
                  <li key={b.id} className={`px-3 py-2 flex items-start gap-3 text-xs ${editing === b.id ? "bg-amber-50" : ""}`}>
                    <div className="w-24 shrink-0 font-semibold text-teal-700" data-no-i18n>{b.start}–{b.end}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 break-words" dir="auto" data-no-i18n>{b.title}</div>
                      {b.project && <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px]" dir="auto" data-no-i18n>{b.project}</span>}
                      {b.notes && <div className="text-[11px] text-gray-500 mt-0.5 break-words" dir="auto" data-no-i18n>{b.notes}</div>}
                    </div>
                    <div className="shrink-0 text-gray-500" data-no-i18n>{hm(b.minutes)}</div>
                    <button onClick={() => edit(b)} title="Edit" className="p-1 text-teal-600 hover:bg-teal-50 rounded">✎</button>
                    <button onClick={() => remove(b)} title="Delete" className="p-1 text-red-500 hover:bg-red-50 rounded">✕</button>
                  </li>
                ))}
              </ul>
            )}

            {/* Hours per project */}
            {blocks.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-gray-700 mb-1.5">Hours by project</h4>
                <div className="flex flex-wrap gap-2">
                  {data.by_project.map((p) => (
                    <span key={p.project || "-"} className="px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-[11px]">
                      {p.project ? <span dir="auto" data-no-i18n>{p.project}</span> : <span>No project</span>}
                      <span className="text-gray-400"> · </span><span className="font-semibold" data-no-i18n>{hm(p.minutes)}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

/** The tasks I gave other people, open ones first. */
function AssignedByMe({ rows, onOpen, onCalendar, onEdit }) {
  const [filter, setFilter] = useState("open");
  const list = rows.filter((t) => filter === "all" || (filter === "open" ? !["completed", "cancelled"].includes(t.status) : t.status === filter));

  return (
    <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <header className="px-4 py-2 border-b border-gray-100 flex flex-wrap items-center gap-2">
        {[["open", "Open"], ["completed", "Completed"], ["cancelled", "Cancelled"], ["all", "All"]].map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-3 py-1 rounded-lg text-[11px] font-semibold ${filter === k ? "bg-teal-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}>{label}</button>
        ))}
      </header>
      {list.length === 0 ? (
        <p className="p-8 text-center text-xs text-gray-400">No tasks here.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-start">Task</th>
                <th className="px-3 py-2 text-start">Assigned to</th>
                <th className="px-3 py-2 text-start">Status</th>
                <th className="px-3 py-2 text-start">Progress</th>
                <th className="px-3 py-2 text-start">Planned for</th>
                <th className="px-3 py-2 text-start">Deadline</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((t) => {
                const st = STATUS[t.status] || STATUS.pending;
                return (
                  <tr key={t.id} onClick={() => onOpen(t)} className="hover:bg-teal-50/40 cursor-pointer">
                    <td className="px-3 py-2 max-w-xs"><div className="truncate font-medium text-gray-800" dir="auto" data-no-i18n>{t.task}{t.report && <span className="ms-1" title="Has a report">📝</span>}</div>
                      {t.last_update && <div className="truncate text-[10px] text-gray-400" dir="auto" data-no-i18n>{t.last_update}</div>}</td>
                    <td className="px-3 py-2 whitespace-nowrap" data-no-i18n>{t.assignee}</td>
                    <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${st.chip}`}>{st.label}</span>
                      {t.live_status === "blocked" && <span className="ms-1 text-[10px] text-red-600 font-bold">Blocked</span>}</td>
                    <td className="px-3 py-2 w-32">
                      <div className="flex items-center gap-1.5"><div className="flex-1 h-1.5 rounded bg-gray-100 overflow-hidden"><div className="h-full bg-teal-500" style={{ width: `${t.status === "completed" ? 100 : t.progress || 0}%` }} /></div>
                        <span className="text-[10px] text-gray-500" data-no-i18n>{t.status === "completed" ? 100 : t.progress || 0}%</span></div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap" data-no-i18n>{t.planned_date ? `${t.planned_date}${t.planned_time ? ` ${t.planned_time}${t.end_time ? `–${t.end_time}` : ""}` : ""}` : "—"}</td>
                    <td className={`px-3 py-2 whitespace-nowrap ${t.overdue ? "text-red-600 font-semibold" : ""}`} data-no-i18n>{t.deadline || "—"}</td>
                    <td className="px-3 py-2 text-end">
                      <div className="flex justify-end gap-1">
                        <button onClick={(e) => { e.stopPropagation(); onEdit(t); }} title="Edit this task"
                          className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        {!["completed", "cancelled"].includes(t.status) && (
                          <button onClick={(e) => { e.stopPropagation(); onCalendar(t); }} title="Open their calendar to move this task"
                            className="px-2 py-1 rounded-lg border border-teal-200 text-teal-700 hover:bg-teal-50 text-xs">📅</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
