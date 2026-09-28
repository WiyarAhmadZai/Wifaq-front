import { useCallback, useEffect, useState } from "react";
import { get } from "../../api/axios";
import TaskCalendar from "./TaskCalendar";

/**
 * One staff member's tasks on a month calendar — read-only. Shown on their
 * profile and, from the Staff Tasks list, in a pop-up. The server decides who
 * may look (admins/HR, the person's supervisors, the person); anyone else
 * gets nothing rendered, or `deniedText` if one is given.
 */
export default function StaffTaskCalendar({ staffId, deniedText = null }) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [data, setData] = useState(null);
  const [denied, setDenied] = useState(false);

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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-[11px]">
        {[["Open", s.open, "bg-sky-50 text-sky-700"], ["Completed", s.completed, "bg-emerald-50 text-emerald-700"],
          ["Overdue", s.overdue, "bg-red-50 text-red-700"], ["Unplanned", s.unplanned, "bg-amber-50 text-amber-700"]].map(([label, n, cls]) => (
          <span key={label} className={`px-2.5 py-1 rounded-lg font-semibold ${cls}`}><span>{label}</span> <b data-no-i18n>{n}</b></span>
        ))}
      </div>
      <TaskCalendar tasks={data.tasks} month={month} onMonth={shift} />
    </div>
  );
}
