import { useMemo, useState } from "react";

/**
 * A month of staff tasks, week rows starting Saturday (the school week).
 *
 * Editable (My Tasks): drag a task onto a day to plan it, onto another task
 * to put it before that one, or onto "Unplanned" to take its day away; click
 * a task to change its status. Read-only (a staff profile): the same picture
 * — what is done on which day, and how far each task has got.
 *
 * A task sits on its `calendar_date`: the day it is planned for, or, for a
 * finished task nobody planned, the day it was finished.
 */

const TASK_STATUS = {
  pending:     { label: "Pending",     chip: "bg-amber-50 text-amber-700 border-amber-200",       bar: "border-s-amber-400" },
  in_progress: { label: "In Progress", chip: "bg-sky-50 text-sky-700 border-sky-200",             bar: "border-s-sky-500" },
  completed:   { label: "Completed",   chip: "bg-emerald-50 text-emerald-700 border-emerald-200", bar: "border-s-emerald-500" },
  cancelled:   { label: "Cancelled",   chip: "bg-gray-100 text-gray-500 border-gray-200",         bar: "border-s-gray-300" },
};

const WEEKDAYS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const byOrder = (a, b) => (a.sort_order ?? 1e9) - (b.sort_order ?? 1e9) || (a.planned_time || "99").localeCompare(b.planned_time || "99") || a.id - b.id;

export default function TaskCalendar({
  tasks = [], month, onMonth, editable = false,
  onMove, onReorder, onOpen, showUnplanned = true,
}) {
  const [dragId, setDragId] = useState(null);
  const [over, setOver] = useState(null); // a date, "unplanned", or "task:<id>"

  // The grid: from the Saturday on/before the 1st to the Friday on/after the last day.
  const { cells, monthLabel } = useMemo(() => {
    const first = new Date(`${month}-01T00:00:00`);
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    const start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() + 1) % 7)); // back to Saturday
    const end = new Date(last);
    end.setDate(last.getDate() + (6 - ((last.getDay() + 1) % 7))); // on to Friday
    const out = [];
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      out.push({ date: iso(d), day: d.getDate(), inMonth: d.getMonth() === first.getMonth() });
    }
    return { cells: out, monthLabel: first.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) };
  }, [month]);

  const byDay = useMemo(() => {
    const m = {};
    tasks.forEach((t) => { if (t.calendar_date) (m[t.calendar_date] ||= []).push(t); });
    Object.values(m).forEach((l) => l.sort(byOrder));
    return m;
  }, [tasks]);
  const unplanned = useMemo(() => tasks.filter((t) => !t.calendar_date && !["completed", "cancelled"].includes(t.status)).sort(byOrder), [tasks]);
  const today = iso(new Date());

  const find = (id) => tasks.find((t) => String(t.id) === String(id));

  /* Drop on a day / the unplanned list: move there (to the end). Drop on a
     task: move to that task's day, just before it, and save the new order. */
  const dropZone = (key) => !editable ? {} : {
    onDragOver: (e) => { if (dragId) { e.preventDefault(); e.stopPropagation(); setOver(key); } },
    onDragLeave: (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver((o) => (o === key ? null : o)); },
    onDrop: (e) => {
      e.preventDefault(); e.stopPropagation();
      const t = find(e.dataTransfer.getData("text/plain") || dragId);
      setOver(null); setDragId(null);
      if (!t) return;
      if (key.startsWith("task:")) {
        const target = find(key.slice(5));
        if (!target || target.id === t.id) return;
        const date = target.calendar_date || null;
        const list = (date ? byDay[date] || [] : unplanned).filter((x) => x.id !== t.id);
        const at = list.findIndex((x) => x.id === target.id);
        list.splice(at, 0, t);
        if ((t.calendar_date || null) !== date) onMove?.(t, date);
        onReorder?.(list.map((x) => x.id), date);
        return;
      }
      const date = key === "unplanned" ? null : key;
      if ((t.calendar_date || null) === date) return;
      onMove?.(t, date);
    },
  };

  const Chip = ({ t }) => {
    const st = TASK_STATUS[t.status] || TASK_STATUS.pending;
    const done = t.status === "completed";
    return (
      <div
        draggable={editable && t.status !== "cancelled"}
        onDragStart={(e) => { e.dataTransfer.setData("text/plain", String(t.id)); e.dataTransfer.effectAllowed = "move"; setDragId(t.id); }}
        onDragEnd={() => { setDragId(null); setOver(null); }}
        {...dropZone(`task:${t.id}`)}
        onClick={() => onOpen?.(t)}
        title={t.task}
        className={`group rounded-md border border-gray-200 border-s-4 ${st.bar} bg-white px-1.5 py-1 text-[10px] leading-tight shadow-sm
          ${onOpen ? "cursor-pointer hover:border-teal-300" : ""} ${editable ? "active:cursor-grabbing" : ""}
          ${dragId === t.id ? "opacity-40" : ""} ${over === `task:${t.id}` ? "ring-2 ring-teal-400" : ""}`}>
        <div className={`font-medium text-gray-800 line-clamp-2 ${done ? "line-through text-gray-400" : ""}`} dir="auto" data-no-i18n>{t.task}</div>
        <div className="mt-0.5 flex items-center gap-1 text-gray-400">
          {t.planned_time && <span data-no-i18n>{t.planned_time}</span>}
          {t.overdue && <span className="text-red-600 font-bold">!</span>}
          <span className="ms-auto" data-no-i18n>{t.progress || 0}%</span>
        </div>
        <div className="mt-0.5 h-0.5 rounded bg-gray-100 overflow-hidden"><div className={`h-full ${done ? "bg-emerald-500" : "bg-teal-500"}`} style={{ width: `${done ? 100 : t.progress || 0}%` }} /></div>
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-3 items-start">
      {showUnplanned && (
        <section {...dropZone("unplanned")}
          className={`w-full lg:w-56 shrink-0 rounded-xl border bg-white overflow-hidden ${over === "unplanned" ? "border-amber-400 ring-2 ring-amber-200" : "border-amber-200"}`}>
          <header className="px-3 py-2 bg-amber-50 text-amber-900 text-xs font-bold flex justify-between">
            <span>Unplanned</span><span className="font-normal" data-no-i18n>{unplanned.length}</span>
          </header>
          {editable && <p className="px-3 pt-2 text-[10px] text-gray-400">Drag a task onto a day.</p>}
          <div className="p-2 space-y-1.5 min-h-[80px] max-h-[60vh] overflow-y-auto">
            {unplanned.length === 0 && <p className="text-[11px] text-gray-400 text-center py-4">Nothing unplanned.</p>}
            {unplanned.map((t) => <Chip key={t.id} t={t} />)}
          </div>
        </section>
      )}

      <section className="flex-1 min-w-0 w-full rounded-xl border border-gray-200 bg-white overflow-hidden">
        <header className="px-3 py-2 flex items-center justify-between border-b border-gray-100">
          <button onClick={() => onMonth?.(-1)} className="px-2 py-1 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Previous month">‹</button>
          <span className="text-sm font-bold text-gray-800" data-no-i18n>{monthLabel}</span>
          <button onClick={() => onMonth?.(1)} className="px-2 py-1 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Next month">›</button>
        </header>
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
              {WEEKDAYS.map((w) => <div key={w} className="px-2 py-1 text-[10px] font-bold uppercase text-gray-500">{w}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((c) => {
                const list = byDay[c.date] || [];
                return (
                  <div key={c.date} {...dropZone(c.date)}
                    className={`min-h-[96px] border-b border-e border-gray-100 p-1 space-y-1 transition
                      ${c.inMonth ? "" : "bg-gray-50/70"} ${c.date === today ? "bg-amber-50/60" : ""}
                      ${over === c.date ? "bg-teal-50 ring-2 ring-inset ring-teal-300" : ""}`}>
                    <div className={`text-[10px] font-semibold ${c.date === today ? "text-amber-700" : c.inMonth ? "text-gray-600" : "text-gray-300"}`} data-no-i18n>{c.day}</div>
                    {list.map((t) => <Chip key={t.id} t={t} />)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
