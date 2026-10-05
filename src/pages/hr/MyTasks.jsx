import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { get, put } from "../../api/axios";
import { PageHeader, Spinner } from "../../components/hr/HrUI";
import TaskCalendar from "../../components/hr/TaskCalendar";
import StaffTaskCalendar, { QuickTaskModal, TaskStatusModal } from "../../components/hr/StaffTaskCalendar";

/**
 * My Tasks.
 *
 * "My calendar": every task assigned to me on a month calendar I arrange
 * myself — drag a task onto a day, onto another task to order the day, or
 * back to Unplanned; click one to change its status. "Assigned by me": the
 * tasks I gave other people, and where each one stands.
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
  const [tab, setTab] = useState("mine");
  const [month, setMonth] = useState(thisMonth);
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);   // the task whose status is being changed
  const [calendarFor, setCalendarFor] = useState(null); // { id, name } — an assignee's calendar
  const [adding, setAdding] = useState(null);           // { date } — adding tasks to my own calendar

  const load = useCallback(() => get("/hr/staff-tasks/my-tasks", { cache: false, params: { month } })
    .then((r) => setData(r.data))
    .catch(() => Swal.fire("Error", "Could not load your tasks.", "error")), [month]);
  useEffect(() => { load(); }, [load]);

  const fail = (e, text) => Swal.fire("Error", e.response?.data?.message || text, "error");

  /* Optimistic: the card moves at once; the server confirms (or we reload). */
  const patchTask = (id, fields) => setData((d) => d && ({ ...d, mine: d.mine.map((t) => (t.id === id ? { ...t, ...fields } : t)) }));

  const move = (t, date) => {
    patchTask(t.id, { calendar_date: date, planned_date: date, ...(date ? {} : { planned_time: null }) });
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
      <PageHeader title="My Tasks" subtitle="Plan your tasks on the calendar and keep their status up to date"
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
        <TaskCalendar
          tasks={data.mine}
          month={month}
          onMonth={(by) => setMonth((m) => shiftMonth(m, by))}
          editable
          onMove={move}
          onReorder={reorder}
          onOpen={setOpen}
          // Anyone may add tasks to their own day — several, each with an optional time.
          onAddDay={data.my_staff_id ? (date) => setAdding({ date }) : undefined}
          onAddUnplanned={data.my_staff_id ? () => setAdding({ date: null }) : undefined}
        />
      ) : (
        <AssignedByMe rows={data.assigned_by_me} onOpen={(t) => navigate(`/hr/staff-task/show/${t.id}`)}
          onCalendar={(t) => setCalendarFor({ id: t.staff_id, name: t.assignee })} />
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
        <TaskStatusModal task={open} onClose={() => setOpen(null)}
          onSaved={() => { setOpen(null); load(); }} />
      )}
    </div>
  );
}

/** The tasks I gave other people, open ones first. */
function AssignedByMe({ rows, onOpen, onCalendar }) {
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
                    <td className="px-3 py-2 max-w-xs"><div className="truncate font-medium text-gray-800" dir="auto" data-no-i18n>{t.task}</div>
                      {t.last_update && <div className="truncate text-[10px] text-gray-400" dir="auto" data-no-i18n>{t.last_update}</div>}</td>
                    <td className="px-3 py-2 whitespace-nowrap" data-no-i18n>{t.assignee}</td>
                    <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${st.chip}`}>{st.label}</span>
                      {t.live_status === "blocked" && <span className="ms-1 text-[10px] text-red-600 font-bold">Blocked</span>}</td>
                    <td className="px-3 py-2 w-32">
                      <div className="flex items-center gap-1.5"><div className="flex-1 h-1.5 rounded bg-gray-100 overflow-hidden"><div className="h-full bg-teal-500" style={{ width: `${t.status === "completed" ? 100 : t.progress || 0}%` }} /></div>
                        <span className="text-[10px] text-gray-500" data-no-i18n>{t.status === "completed" ? 100 : t.progress || 0}%</span></div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap" data-no-i18n>{t.planned_date ? `${t.planned_date}${t.planned_time ? ` ${t.planned_time}` : ""}` : "—"}</td>
                    <td className={`px-3 py-2 whitespace-nowrap ${t.overdue ? "text-red-600 font-semibold" : ""}`} data-no-i18n>{t.deadline || "—"}</td>
                    <td className="px-3 py-2 text-end">
                      {!["completed", "cancelled"].includes(t.status) && (
                        <button onClick={(e) => { e.stopPropagation(); onCalendar(t); }} title="Open their calendar to move this task"
                          className="px-2 py-1 rounded-lg border border-teal-200 text-teal-700 hover:bg-teal-50 text-xs">📅</button>
                      )}
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
