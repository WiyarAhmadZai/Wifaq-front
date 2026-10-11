import { useEffect, useState } from "react";
import { get, API_BASE_URL } from "../../api/axios";
import { Spinner } from "./HrUI";
import { fmtDateTime } from "../../utils/formErrors";

/**
 * One staff member's whole day, Google/Mac Calendar style:
 * a timeline of everything that holds their time (lessons,
 * meetings, appointments, events, tasks, leave), the tasks
 * planned on the day, the check-ins they left, and the
 * free slots left in between.
 *
 * Data comes from GET /hr/staff-tasks/day — the server
 * decides who may look (the person, their supervisors,
 * whoever assigned them a task) and how much of each
 * block's title the viewer sees.
 *
 * Used two ways: full page (Day View menu) and a pop-up
 * opened by clicking a day on any task calendar.
 */

const STORAGE = API_BASE_URL.replace(/\/api\/?$/, "");

// The working day the schedule is drawn across (ScheduleConflicts).
const DAY_START = 6 * 60;   // 06:00
const DAY_END = 17 * 60;    // 17:00
const DAY_SPAN = DAY_END - DAY_START;

const toMin = (hm) => { const [h, m] = String(hm || "").split(":"); return (Number(h) || 0) * 60 + (Number(m) || 0); };

const KIND = {
  lesson:      { label: "Teaching",     cls: "bg-indigo-100 border-indigo-300 text-indigo-800" },
  unavailable: { label: "Unavailable",    cls: "bg-gray-200 border-gray-300 text-gray-700" },
  meeting:     { label: "Meeting",        cls: "bg-sky-100 border-sky-300 text-sky-800" },
  appointment: { label: "Appointment",    cls: "bg-teal-100 border-teal-300 text-teal-800" },
  event:       { label: "Event",          cls: "bg-violet-100 border-violet-300 text-violet-800" },
  task:        { label: "Busy in a task", cls: "bg-amber-100 border-amber-300 text-amber-800" },
  leave:       { label: "On leave",       cls: "bg-red-100 border-red-300 text-red-800" },
  holiday:     { label: "Holiday",        cls: "bg-rose-100 border-rose-300 text-rose-800" },
};

const TASK_STATUS = {
  pending:     { label: "Pending",     chip: "bg-amber-50 text-amber-700 border-amber-200" },
  in_progress: { label: "In Progress", chip: "bg-sky-50 text-sky-700 border-sky-200" },
  completed:   { label: "Completed",   chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled:   { label: "Cancelled",   chip: "bg-gray-100 text-gray-500 border-gray-200" },
};

const CHECKIN_STATUS = {
  on_track: { label: "On track", chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  at_risk:  { label: "At risk",  chip: "bg-amber-50 text-amber-700 border-amber-200" },
  blocked:  { label: "Blocked",  chip: "bg-red-50 text-red-700 border-red-200" },
  done:     { label: "Done",     chip: "bg-teal-50 text-teal-700 border-teal-200" },
};

const CLOSED_LABEL = { weekend: "Weekend", holiday: "Holiday", leave: "On leave", absent: "Absent" };

const HOURS = [];
for (let h = 6; h <= 17; h++) HOURS.push(h);

export default function DayDetail({ staffId, staffName, date, onOpenTask }) {
  const [data, setData] = useState(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let alive = true;
    get("/hr/staff-tasks/day", { cache: false, params: { staff_id: staffId, date } })
      .then((r) => { if (alive) setData(r.data); })
      .catch((e) => { if (alive && e.response?.status === 403) setDenied(true); });
    return () => { alive = false; };
  }, [staffId, date]);

  if (denied) {
    return <p className="p-8 text-center text-sm text-gray-500">You may not see this person's day.</p>;
  }
  if (!data) {
    return <div className="flex justify-center py-16"><Spinner /></div>;
  }

  const s = data.schedule;
  const allDay = s.busy.filter((b) => b.all_day);
  const timed = s.busy.filter((b) => !b.all_day);
  const nice = new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const tasks = [...data.tasks].sort((a, b) => (a.planned_time || "99").localeCompare(b.planned_time || "99") || a.id - b.id);

  return (
    <div className="space-y-4">
      {/* Who and when */}
      <div className="flex flex-wrap items-center gap-3">
        {data.staff?.profile_photo ? (
          <img src={`${STORAGE}/storage/${data.staff.profile_photo}`} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-11 h-11 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold flex-shrink-0" data-no-i18n>
            {(data.staff?.name || "?").charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <div className="font-semibold text-gray-800" data-no-i18n>{data.staff?.name || staffName}</div>
          <div className="text-[11px] text-gray-400" data-no-i18n>
            {data.staff?.employee_id}{data.staff?.department ? ` · ${data.staff.department}` : ""}{data.staff?.role_title ? ` · ${data.staff.role_title}` : ""}
          </div>
        </div>
        <div className="ms-auto text-right">
          <div className="text-sm font-bold text-gray-800" data-no-i18n>{nice}</div>
          <div className="text-[11px] text-gray-400">
            <span data-no-i18n>{data.summary.tasks_open}</span> open · <span data-no-i18n>{data.summary.tasks_completed}</span> completed · <span data-no-i18n>{data.summary.free_slots}</span> free slots
          </div>
        </div>
      </div>

      {/* A day that is off entirely */}
      {s.closed && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {CLOSED_LABEL[s.closed] || s.closed} — the whole day is off
        </div>
      )}

      {/* All-day blocks: leave, holidays, events */}
      {allDay.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allDay.map((b, i) => {
            const k = KIND[b.kind] || KIND.event;
            return (
              <span key={i} className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${k.cls}`}>
                {b.label || k.label}
              </span>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
        {/* The timeline */}
        <section className="lg:col-span-3 rounded-xl border border-gray-200 bg-white overflow-hidden">
          <header className="px-4 py-2.5 border-b border-gray-100 text-xs font-bold text-gray-700">
            Timeline <span className="font-normal text-gray-400">06:00 – 17:00</span>
          </header>
          <div className="flex">
            {/* Hour gutter */}
            <div className="w-14 shrink-0 border-e border-gray-100 bg-gray-50/60">
              {HOURS.map((h) => (
                <div key={h} className="h-14 flex items-start justify-end pe-1.5 pt-0.5">
                  <span className="text-[9px] font-semibold text-gray-400" data-no-i18n>{String(h).padStart(2, "0")}:00</span>
                </div>
              ))}
            </div>
            {/* The day itself: blocks placed by their clock time */}
            <div className="relative flex-1" style={{ height: `${HOURS.length * 56}px` }}>
              {HOURS.map((h) => (
                <div key={h} className="h-14 border-b border-gray-100/80" />
              ))}
              {timed.map((b, i) => {
                const k = KIND[b.kind] || KIND.event;
                const top = Math.max(0, (toMin(b.start) - DAY_START) / DAY_SPAN) * 100;
                const bottom = Math.min(1, (toMin(b.end) - DAY_START) / DAY_SPAN) * 100;
                return (
                  <div key={i}
                    title={`${b.start}–${b.end} · ${b.label || k.label}`}
                    className={`absolute inset-x-1 rounded-lg border-l-4 px-2 py-1 overflow-hidden ${k.cls}`}
                    style={{ top: `${top}%`, height: `${Math.max(2.5, bottom - top)}%` }}>
                    <div className="text-[10px] font-bold leading-tight" data-no-i18n>{b.start}–{b.end}</div>
                    {b.label && <div className="text-[10px] leading-tight truncate" dir="auto" data-no-i18n>{b.label}</div>}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Free slots */}
          {s.free.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-100">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Free</div>
              <div className="flex flex-wrap gap-1.5">
                {s.free.map((f, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold" data-no-i18n>{f.start}–{f.end}</span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Tasks + check-ins */}
        <section className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <header className="px-4 py-2.5 border-b border-gray-100 text-xs font-bold text-gray-700">
              Tasks on this day <span className="font-normal text-gray-400" data-no-i18n>({tasks.length})</span>
            </header>
            {tasks.length === 0 ? (
              <p className="px-4 py-6 text-center text-[11px] text-gray-400">Nothing planned.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {tasks.map((t) => {
                  const st = TASK_STATUS[t.status] || TASK_STATUS.pending;
                  return (
                    <div key={t.id}
                      onClick={() => onOpenTask?.(t)}
                      className={`px-4 py-3 ${onOpenTask ? "cursor-pointer hover:bg-teal-50/40" : ""}`}>
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
                        <span className="ms-auto text-[10px] text-gray-400" data-no-i18n>{t.progress || 0}%</span>
                      </div>
                      <div className="mt-1 text-xs font-medium text-gray-800 leading-snug line-clamp-2" dir="auto" data-no-i18n>{t.task}</div>
                      {t.assigned_by && <div className="mt-0.5 text-[10px] text-gray-400" data-no-i18n>Assigned by {t.assigned_by}</div>}
                      <div className="mt-1.5 h-1 rounded bg-gray-100 overflow-hidden">
                        <div className={`h-full ${t.status === "completed" ? "bg-emerald-500" : "bg-teal-500"}`} style={{ width: `${t.status === "completed" ? 100 : t.progress || 0}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <header className="px-4 py-2.5 border-b border-gray-100 text-xs font-bold text-gray-700">
              Check-ins <span className="font-normal text-gray-400" data-no-i18n>({data.checkins.length})</span>
            </header>
            {data.checkins.length === 0 ? (
              <p className="px-4 py-6 text-center text-[11px] text-gray-400">No check-ins on this day.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {data.checkins.map((c) => {
                  const cs = CHECKIN_STATUS[c.status] || CHECKIN_STATUS.on_track;
                  return (
                    <div key={c.id} className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded-full border text-[9px] font-semibold ${cs.chip}`}>{cs.label}</span>
                        {typeof c.progress_pct === "number" && <span className="text-[10px] text-gray-400" data-no-i18n>{c.progress_pct}%</span>}
                        <span className="ms-auto text-[10px] text-gray-400" data-no-i18n>{fmtDateTime(c.created_at)}</span>
                      </div>
                      {c.update_text && <p className="mt-1 text-xs text-gray-700 leading-relaxed whitespace-pre-wrap" dir="auto" data-no-i18n>{c.update_text}</p>}
                      {c.blocked_reason && <p className="mt-1 text-[10px] text-red-600" dir="auto" data-no-i18n>Blocked: {c.blocked_reason}</p>}
                      {c.task && <p className="mt-1 text-[10px] text-gray-400 truncate" dir="auto" data-no-i18n>↳ {c.task.label}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/** The same day view in a pop-up over a calendar. */
export function DayDetailModal({ staffId, staffName, date, onClose, onOpenTask }) {
  return (
    <div className="fixed inset-0 z-[55] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="text-xs text-gray-400">Day view — click a task to change its status</div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
        <div className="p-5">
          {/* The key remounts the view for each person/day, so it
              always opens on its own loading state. */}
          <DayDetail key={`${staffId}-${date}`} staffId={staffId} staffName={staffName} date={date} onOpenTask={onOpenTask} />
        </div>
      </div>
    </div>
  );
}
