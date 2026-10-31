import { useEffect, useState } from "react";
import { FiX, FiCalendar, FiCheckSquare, FiAward, FiStar, FiSun } from "react-icons/fi";
import { get } from "../../api/axios";
import { StackedBars, Bars, Donut, TrendLine } from "./InsightCharts";

/* Leave types get fixed, calm colours so the ring reads the same every time. */
const LEAVE_COLORS = ["#0d9488", "#6366f1", "#f59e0b", "#ec4899", "#0ea5e9", "#84cc16", "#a855f7"];
const STATUS_TONE = {
  approved: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  rejected: "bg-rose-50 text-rose-700",
};

/**
 * "More info" on a profile — attendance, leave, tasks (with the person's place
 * on the task leaderboard) and ratings, with six-month charts. One request:
 * GET /profile/{userId}/insights, which only the person and admins may read.
 */
export default function ProfileInsights({ userId, name, onClose }) {
  const [data, setData] = useState(undefined);   // undefined = loading, null = no staff record
  const [error, setError] = useState(null);

  useEffect(() => {
    get(`/profile/${userId}/insights`, { cache: false })
      .then((r) => setData(r.data?.data ?? null))
      .catch((e) => setError(e.response?.data?.message || "Could not load these details."));
  }, [userId]);

  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[870] bg-slate-900/50 flex justify-center overflow-y-auto p-3 sm:p-6" onClick={onClose}>
      <div className="w-full max-w-5xl h-fit rounded-3xl bg-gray-50 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-teal-700 to-emerald-600 text-white">
          <div>
            <h2 className="text-lg font-bold" data-no-i18n>{name}</h2>
            <p className="text-xs text-teal-100">Attendance, leave, tasks and ratings</p>
          </div>
          <button type="button" onClick={onClose} title="Close"
            className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 grid place-items-center"><FiX className="w-5 h-5" /></button>
        </div>

        <div className="p-4 sm:p-6">
          {error ? <Empty text={error} />
            : data === undefined ? <Loading />
            : data === null ? <Empty text="There is no staff record behind this account, so there is nothing to show yet." />
            : <Body d={data} />}
        </div>
      </div>
    </div>
  );
}

function Body({ d }) {
  const { staff, attendance, leave, tasks, ratings } = d;
  const bal = leave.balance || {};
  return (
    <div className="space-y-5">
      {/* who */}
      <div className="flex flex-wrap gap-2 text-xs">
        {[staff.employee_id, staff.position, staff.department, staff.branch].filter(Boolean).map((x) => (
          <span key={x} className="px-3 py-1 rounded-full bg-white border border-gray-200 text-gray-700" data-no-i18n>{x}</span>
        ))}
        {staff.joined && <span className="px-3 py-1 rounded-full bg-white border border-gray-200 text-gray-700"><span>Joined</span> <span data-no-i18n>{staff.joined}</span></span>}
      </div>

      {/* the numbers that matter */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi icon={<FiCalendar className="w-4 h-4" />} tone="text-teal-600 bg-teal-50" label="Attendance rate" value={attendance.rate == null ? "—" : `${attendance.rate}%`} />
        <Kpi icon={<FiCheckSquare className="w-4 h-4" />} tone="text-indigo-600 bg-indigo-50" label="Tasks completed" value={tasks.completion_rate == null ? "—" : `${tasks.completion_rate}%`} sub={`${tasks.completed} / ${tasks.assigned}`} />
        <Kpi icon={<FiAward className="w-4 h-4" />} tone="text-amber-600 bg-amber-50" label="Leaderboard (this month)" value={tasks.rank ? `#${tasks.rank}` : "—"} sub={tasks.rank ? `of ${tasks.ranked_of}` : null} />
        <Kpi icon={<FiStar className="w-4 h-4" />} tone="text-rose-500 bg-rose-50" label="Average rating" value={ratings.average == null ? "—" : `${ratings.average} / 5`} sub={ratings.count ? `${ratings.count}` : null} />
        <Kpi icon={<FiSun className="w-4 h-4" />} tone="text-emerald-600 bg-emerald-50" label="Leave remaining" value={bal.is_configured ? `${bal.remaining_days}` : "—"} sub={bal.is_configured ? `of ${bal.allowance_days}` : null} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Attendance — last 6 months">
          <StackedBars data={attendance.trend} parts={[
            { key: "present", label: "Present", color: "bg-emerald-500" },
            { key: "late", label: "Late", color: "bg-amber-400" },
            { key: "leave", label: "Leave", color: "bg-sky-400" },
            { key: "absent", label: "Absent", color: "bg-rose-400" },
          ]} />
        </Card>
        <Card title="Tasks completed — last 6 months">
          <Bars data={tasks.trend} valueKey="completed" color="bg-indigo-500" />
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <Mini label="In progress" value={tasks.in_progress} />
            <Mini label="Pending" value={tasks.pending} />
            <Mini label="Overdue" value={tasks.overdue} warn={tasks.overdue > 0} />
          </div>
        </Card>
        <Card title="Leave this year">
          {leave.by_type.length ? (
            <Donut centerLabel="days" items={leave.by_type.map((x, i) => ({ label: x.type, value: x.days, hex: LEAVE_COLORS[i % LEAVE_COLORS.length] }))} />
          ) : <p className="text-sm text-gray-400 py-6 text-center">No approved leave this year.</p>}
          {leave.recent.length > 0 && (
            <ul className="mt-4 divide-y divide-gray-100 text-xs">
              {leave.recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2">
                  <span className="capitalize text-gray-700">{r.type}</span>
                  <span className="text-gray-500" data-no-i18n>{r.from}{r.to && r.to !== r.from ? ` → ${r.to}` : ""} · {r.days}d</span>
                  <span className={`px-2 py-0.5 rounded-full capitalize ${STATUS_TONE[r.status] || "bg-gray-100 text-gray-600"}`}>{r.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Rating — last 6 months">
          {ratings.count ? <TrendLine data={ratings.trend} valueKey="average" color="#e11d48" />
            : <p className="text-sm text-gray-400 py-6 text-center">Not rated yet.</p>}
          <p className="text-[11px] text-gray-400 mt-2">Average of the five standards, out of 5.</p>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon, tone, label, value, sub }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
      <span className={`w-9 h-9 rounded-xl grid place-items-center ${tone}`}>{icon}</span>
      <div className="mt-3 text-2xl font-black text-gray-800" data-no-i18n>{value}</div>
      <div className="text-[11px] text-gray-500">{label}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-0.5" data-no-i18n>{sub}</div>}
    </div>
  );
}

function Card({ title, children }) {
  return (
    <section className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
      <h3 className="text-sm font-bold text-gray-800 mb-4">{title}</h3>
      {children}
    </section>
  );
}

function Mini({ label, value, warn = false }) {
  return (
    <div className={`rounded-xl py-2 ${warn ? "bg-rose-50" : "bg-gray-50"}`}>
      <div className={`text-lg font-bold ${warn ? "text-rose-600" : "text-gray-800"}`} data-no-i18n>{value}</div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  );
}

const Loading = () => (
  <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
);
const Empty = ({ text }) => <p className="text-sm text-gray-500 text-center py-16">{text}</p>;
