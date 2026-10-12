import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { get, put } from "../../api/axios";
import { PageHeader, Spinner } from "../../components/hr/HrUI";
import TaskCalendar from "../../components/hr/TaskCalendar";
import StaffTaskCalendar, { QuickTaskModal, TaskStatusModal } from "../../components/hr/StaffTaskCalendar";
import { DayDetailModal } from "../../components/hr/DayDetail";

/**
 * My Tasks.
 *
 * "My calendar": the days at the top — today first, then the
 * older days below it (scroll down for the dates further back,
 * or load whole earlier months) — and the month calendar under
 * them, where a task can be dragged onto a day, onto another
 * task to order the day, or back to Unplanned. "Assigned by me":
 * the tasks I gave other people, and where each one stands.
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

/** The order a day's tasks sit in: the arranged order, then the time. */
const byDayOrder = (a, b) =>
  (a.sort_order ?? 1e9) - (b.sort_order ?? 1e9)
  || (a.planned_time || "99").localeCompare(b.planned_time || "99")
  || a.id - b.id;

/** How many earlier months the day list will fetch. */
const MAX_OLDER_MONTHS = 12;

export default function MyTasks() {
  const navigate = useNavigate();
  // "mine" is the calendar, with the days at the top.
  const [tab, setTab] = useState("mine");
  const [month, setMonth] = useState(thisMonth());
  const [data, setData] = useState(null);
  // The day list always starts at TODAY, whatever month the
  // calendar tab happens to be showing — so it keeps its own
  // copy of the current month, refreshed after every change.
  const [home, setHome] = useState(null);
  // Earlier months, fetched on demand as the list reaches back.
  const [olderMonths, setOlderMonths] = useState({});
  const [olderLoading, setOlderLoading] = useState(false);
  const [open, setOpen] = useState(null);   // the task whose status is being changed
  const [calendarFor, setCalendarFor] = useState(null); // { id, name } — an assignee's calendar
  const [adding, setAdding] = useState(null);           // { date } — adding tasks to my own calendar
  const [day, setDay] = useState(null);                 // the day clicked, for the day view

  const load = useCallback(() => get("/hr/staff-tasks/my-tasks", { cache: false, params: { month } })
    .then((r) => setData(r.data))
    .catch(() => Swal.fire("Error", "Could not load your tasks.", "error")), [month]);
  useEffect(() => { load(); }, [load]);

  const loadHome = useCallback(() => get("/hr/staff-tasks/my-tasks", { cache: false, params: { month: thisMonth() } })
    .then((r) => setHome(r.data))
    .catch(() => { /* the calendar copy still shows the tasks */ }), []);
  useEffect(() => { loadHome(); }, [loadHome]);

  const refreshAll = useCallback(() => { load(); loadHome(); }, [load, loadHome]);

  const fail = (e, text) => Swal.fire("Error", e.response?.data?.message || text, "error");

  /* Optimistic: the card moves at once; the server confirms (or we reload). */
  const patchTask = (id, fields) => setData((d) => d && ({ ...d, mine: d.mine.map((t) => (t.id === id ? { ...t, ...fields } : t)) }));

  const move = (t, date) => {
    patchTask(t.id, { calendar_date: date, planned_date: date, ...(date ? {} : { planned_time: null, end_time: null }) });
    put(`/hr/staff-tasks/${t.id}/plan`, { planned_date: date, planned_time: date ? t.planned_time : null })
      .catch((e) => { fail(e, "Could not move the task."); refreshAll(); });
  };
  const reorder = (ids) => {
    setData((d) => d && ({ ...d, mine: d.mine.map((t) => (ids.includes(t.id) ? { ...t, sort_order: ids.indexOf(t.id) + 1 } : t)) }));
    put("/hr/staff-tasks/reorder", { ids }).catch((e) => { fail(e, "Could not save the order."); refreshAll(); });
  };

  /* The day list: every past day of the current month that has
     tasks (today first), plus the earlier months loaded so far. */
  const { days, unplanned } = useMemo(() => {
    const byDate = new Map();
    const addAll = (list) => (list || []).forEach((t) => {
      if (!t.calendar_date) return;
      if (!byDate.has(t.calendar_date)) byDate.set(t.calendar_date, []);
      byDate.get(t.calendar_date).push(t);
    });
    addAll(home?.mine);
    Object.values(olderMonths).forEach(addAll);
    const today = new Date().toISOString().slice(0, 10);
    const dates = [...byDate.keys()].filter((d) => d <= today).sort().reverse();
    return {
      days: dates.map((date) => ({ date, tasks: byDate.get(date).sort(byDayOrder) })),
      unplanned: (home?.mine || [])
        .filter((t) => !t.calendar_date && !["completed", "cancelled"].includes(t.status))
        .sort(byDayOrder),
    };
  }, [home, olderMonths]);

  const oldestMonth = useMemo(() => {
    const keys = Object.keys(olderMonths).sort();
    return keys.length ? keys[0] : thisMonth();
  }, [olderMonths]);
  const canLoadMore = Object.keys(olderMonths).length < MAX_OLDER_MONTHS;

  const loadOlder = useCallback(() => {
    if (olderLoading || !canLoadMore) return;
    const target = shiftMonth(oldestMonth, -1);
    setOlderLoading(true);
    get("/hr/staff-tasks/my-tasks", { cache: false, params: { month: target } })
      .then((r) => setOlderMonths((prev) => (prev[target] ? prev : { ...prev, [target]: r.data?.mine || [] })))
      .catch(() => Swal.fire("Error", "Could not load older days.", "error"))
      .finally(() => setOlderLoading(false));
  }, [oldestMonth, olderLoading, canLoadMore]);

  if (!data) return <div className="flex justify-center py-24"><Spinner /></div>;

  const openCount = data.mine.filter((t) => !["completed", "cancelled"].includes(t.status)).length;

  return (
    <div className="px-4 py-5 space-y-4">
      <PageHeader title="My Tasks" subtitle="Today first — scroll down for older days, or plan on the calendar"
        icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />

      <div className="flex rounded-xl overflow-hidden border border-gray-200 text-xs w-fit bg-white">
        {[["mine", "My calendar", openCount], ["byme", "Assigned by me", data.assigned_by_me.length]].map(([k, label, n]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 font-semibold flex items-center gap-2 ${tab === k ? "bg-teal-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}>
            <span>{label}</span>
            <span className={`px-1.5 rounded-full text-[10px] ${tab === k ? "bg-white/25" : "bg-gray-100"}`} data-no-i18n>{n}</span>
          </button>
        ))}
      </div>

      {tab === "mine" ? (
        <>
          {/* The days, today first and in sequence, at the top of the calendar. */}
          <MyDayList
            days={days}
            unplanned={unplanned}
            onOpenTask={setOpen}
            onOpenDay={setDay}
            onAddUnplanned={home?.my_staff_id ? () => setAdding({ date: null }) : undefined}
            onLoadOlder={loadOlder}
            olderLoading={olderLoading}
            canLoadMore={canLoadMore}
          />
          <TaskCalendar
            tasks={data.mine}
            month={month}
            onMonth={(by) => setMonth((m) => shiftMonth(m, by))}
            editable
            onMove={move}
            onReorder={reorder}
            onOpen={setOpen}
            onDayClick={setDay}
            // Anyone may add tasks to their own day — several, each with an optional time.
            onAddDay={data.my_staff_id ? (date) => setAdding({ date }) : undefined}
            onAddUnplanned={data.my_staff_id ? () => setAdding({ date: null }) : undefined}
          />
        </>
      ) : (
        <AssignedByMe rows={data.assigned_by_me} onOpen={(t) => navigate(`/hr/staff-task/show/${t.id}`)}
          onCalendar={(t) => setCalendarFor({ id: t.staff_id, name: t.assignee })}
          onEdit={(t) => navigate(`/hr/staff-task/edit/${t.id}`)} />
      )}

      {calendarFor && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => { setCalendarFor(null); refreshAll(); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400">Task calendar — drag a task to a free day</div>
                <div className="font-semibold text-gray-800" data-no-i18n>{calendarFor.name}</div>
              </div>
              <button onClick={() => { setCalendarFor(null); refreshAll(); }} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <div className="p-4"><StaffTaskCalendar staffId={calendarFor.id} staffName={calendarFor.name} /></div>
          </div>
        </div>
      )}

      {adding && (
        <QuickTaskModal self staffId={home?.my_staff_id} date={adding.date}
          onClose={() => setAdding(null)} onSaved={() => { setAdding(null); refreshAll(); }} />
      )}

      {open && (
        <TaskStatusModal task={open} canReport onClose={() => setOpen(null)}
          onSaved={() => { setOpen(null); refreshAll(); }} />
      )}

      {day && home?.my_staff_id && (
        <DayDetailModal staffId={home.my_staff_id} staffName="Me" date={day}
          onClose={() => setDay(null)} onOpenTask={setOpen} />
      )}
    </div>
  );
}

/**
 * The day list: today's card first, then the older days below
 * it — scroll down for the dates further back. Each day is a
 * card of its tasks (click one to change its status); the day
 * itself opens the full day view. Earlier months load on
 * demand from the button at the bottom.
 */
function MyDayList({ days, unplanned, onOpenTask, onOpenDay, onAddUnplanned, onLoadOlder, olderLoading, canLoadMore }) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-3">
      {unplanned.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50/60 overflow-hidden">
          <header className="px-4 py-2.5 border-b border-amber-100 flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800">
              Unplanned <span className="font-normal" data-no-i18n>({unplanned.length})</span>
            </span>
            {onAddUnplanned && (
              <button onClick={onAddUnplanned}
                className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-semibold">+ Add task</button>
            )}
          </header>
          <div className="divide-y divide-amber-100/70">
            {unplanned.map((t) => <DayTaskRow key={t.id} task={t} onOpen={onOpenTask} />)}
          </div>
        </section>
      )}

      {days.map(({ date, tasks }) => (
        <DayCard key={date} date={date} tasks={tasks} isToday={date === today}
          onOpenTask={onOpenTask} onOpenDay={onOpenDay} />
      ))}

      {days.length === 0 && unplanned.length === 0 && (
        <p className="py-10 text-center text-xs text-gray-400">No tasks yet — today is clear.</p>
      )}

      {canLoadMore && (
        <div className="flex justify-center py-3">
          <button onClick={onLoadOlder} disabled={olderLoading}
            className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            {olderLoading ? "Loading older days…" : "Show older days"}
          </button>
        </div>
      )}
    </div>
  );
}

/** One day: its date (click for the full day view) and its tasks. */
function DayCard({ date, tasks, isToday, onOpenTask, onOpenDay }) {
  const d = new Date(`${date}T00:00:00`);
  const weekday = d.toLocaleDateString("en-GB", { weekday: "long" });
  const monthName = d.toLocaleDateString("en-GB", { month: "short" });

  return (
    <section className={`rounded-xl border overflow-hidden ${isToday ? "border-teal-300 shadow-sm" : "border-gray-200 bg-white"}`}>
      <header onClick={() => onOpenDay?.(date)}
        className={`px-4 py-2.5 flex items-center gap-3 cursor-pointer transition-colors ${isToday ? "bg-teal-50 hover:bg-teal-100/70" : "bg-gray-50/70 hover:bg-teal-50/50"}`}
        title="Open this day in detail">
        <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center ${isToday ? "bg-teal-600 text-white" : "bg-white border border-gray-200 text-gray-700"}`}>
          <span className="text-base font-bold leading-none" data-no-i18n>{d.getDate()}</span>
          <span className="text-[8px] font-semibold uppercase" data-no-i18n>{monthName}</span>
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-800">{weekday}</div>
          <div className="text-[10px] text-gray-400">
            <span data-no-i18n>{tasks.length}</span> {tasks.length === 1 ? "task" : "tasks"}
          </div>
        </div>
        {isToday && (
          <span className="ms-auto px-2 py-0.5 rounded-full bg-teal-600 text-white text-[9px] font-bold">Today</span>
        )}
      </header>
      {tasks.length > 0 && (
        <div className="divide-y divide-gray-100">
          {tasks.map((t) => <DayTaskRow key={t.id} task={t} onOpen={onOpenTask} />)}
        </div>
      )}
    </section>
  );
}

/** One task row inside a day: its slot, status and progress. */
function DayTaskRow({ task: t, onOpen }) {
  const st = STATUS[t.status] || STATUS.pending;
  const done = t.status === "completed";

  return (
    <div onClick={() => onOpen?.(t)}
      className="px-4 py-2.5 cursor-pointer hover:bg-teal-50/40 transition-colors">
      <div className="flex items-center gap-2">
        {t.planned_time ? (
          <span className="text-[11px] font-bold text-gray-700 whitespace-nowrap" data-no-i18n>
            {t.planned_time}{t.end_time ? `–${t.end_time}` : t.status === "in_progress" ? "–…" : ""}
          </span>
        ) : (
          <span className="text-[10px] text-gray-400 whitespace-nowrap">any time</span>
        )}
        <span className={`px-1.5 py-0.5 rounded-full border text-[9px] font-semibold ${st.chip}`}>{st.label}</span>
        {t.overdue && <span className="text-[9px] font-bold text-red-600">Overdue</span>}
        {t.stale && !done && <span className="text-[9px] font-semibold text-amber-600" title="No check-in for 24 hours">Stale</span>}
        <span className="ms-auto text-[10px] text-gray-400" data-no-i18n>{t.progress || 0}%</span>
      </div>
      <div className={`mt-1 text-xs font-medium leading-snug line-clamp-2 ${done ? "line-through text-gray-400" : "text-gray-800"}`} dir="auto" data-no-i18n>{t.task}</div>
      <div className="mt-1.5 h-1 rounded bg-gray-100 overflow-hidden">
        <div className={`h-full ${done ? "bg-emerald-500" : "bg-teal-500"}`} style={{ width: `${done ? 100 : t.progress || 0}%` }} />
      </div>
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
