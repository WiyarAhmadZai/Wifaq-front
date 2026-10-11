import { useEffect, useState } from "react";
import { get } from "../../api/axios";
import Swal from "sweetalert2";
import { PageHeader, StatGrid, EmptyState, Spinner } from "../../components/hr/HrUI";

/**
 * Task Leaderboard — who is working hardest.
 *
 * One row per staff member with tasks: how many were assigned,
 * how many completed, the completion rate, and how many open
 * ones are overdue. The top three stand on a podium; everyone
 * else fills the table. The month picker changes only the
 * "completed this month" column.
 */

const MEDALS = ["🥇", "🥈", "🥉"];

export default function TaskLeaderboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    setLoading(true);
    get("/hr/staff-tasks/leaderboard", { cache: false, params: { month } })
      .then((r) => setData(r.data))
      .catch((e) => Swal.fire("Error", e.response?.data?.message || "Could not load the leaderboard.", "error"))
      .finally(() => setLoading(false));
  }, [month]);

  if (loading && !data) return <div className="flex justify-center py-24"><Spinner /></div>;
  if (!data) return null;

  const rows = data.rows || [];
  const totalAssigned = rows.reduce((s, r) => s + r.assigned, 0);
  const totalCompleted = rows.reduce((s, r) => s + r.completed, 0);
  const totalOverdue = rows.reduce((s, r) => s + r.overdue, 0);
  const top = rows.slice(0, 3);

  return (
    <div className="px-4 py-5 space-y-4">
      <PageHeader title="Task Leaderboard" subtitle="Who is working hardest — tasks assigned, completed and on time"
        icon="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />

      <StatGrid stats={[
        { label: "Staff with tasks", value: rows.length, tone: "teal" },
        { label: "Tasks assigned", value: totalAssigned, tone: "gray" },
        { label: "Completed", value: totalCompleted, tone: "emerald" },
        { label: "Overdue", value: totalOverdue, tone: "red" },
      ]} />

      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-600">Count completions in</label>
        <input type="month" value={month}
          onChange={(e) => setMonth(e.target.value || new Date().toISOString().slice(0, 7))}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
        <span className="text-[11px] text-gray-400">the “this month” column</span>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No tasks assigned yet" />
      ) : (
        <>
          {/* Podium — the top three by tasks completed */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {top.map((r, i) => (
              <div key={r.staff_id}
                className={`rounded-2xl border p-5 text-center ${i === 0 ? "border-amber-300 bg-amber-50" : i === 1 ? "border-gray-300 bg-gray-50" : "border-orange-300 bg-orange-50"}`}>
                <div className="text-3xl">{MEDALS[i]}</div>
                <div className="mt-1 font-bold text-gray-800" data-no-i18n>{r.staff_name}</div>
                <div className="text-[11px] text-gray-500" data-no-i18n>{r.employee_id}{r.department ? ` · ${r.department}` : ""}</div>
                <div className="mt-3 text-2xl font-extrabold text-teal-700" data-no-i18n>{r.completed}</div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500">completed</div>
                <div className="mt-1 text-[11px] text-gray-500" data-no-i18n>{r.completion_rate}% completion rate</div>
              </div>
            ))}
          </div>

          {/* The full ranking */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-start w-10">#</th>
                  <th className="px-3 py-2 text-start">Staff</th>
                  <th className="px-3 py-2 text-end">Assigned</th>
                  <th className="px-3 py-2 text-end">Completed</th>
                  <th className="px-3 py-2 text-end">This month</th>
                  <th className="px-3 py-2 text-start w-44">Completion</th>
                  <th className="px-3 py-2 text-end">In progress</th>
                  <th className="px-3 py-2 text-end">Pending</th>
                  <th className="px-3 py-2 text-end">Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r, i) => (
                  <tr key={r.staff_id} className="hover:bg-teal-50/40">
                    <td className="px-3 py-2 font-semibold text-gray-500" data-no-i18n>{i + 1}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-800" data-no-i18n>{r.staff_name}</div>
                      <div className="text-[10px] text-gray-400" data-no-i18n>{r.employee_id}{r.role_title ? ` · ${r.role_title}` : ""}</div>
                    </td>
                    <td className="px-3 py-2 text-end" data-no-i18n>{r.assigned}</td>
                    <td className="px-3 py-2 text-end font-semibold text-teal-700" data-no-i18n>{r.completed}</td>
                    <td className="px-3 py-2 text-end" data-no-i18n>{r.completed_this_month}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1.5 rounded bg-gray-100 overflow-hidden">
                          <div className={`h-full ${r.completion_rate >= 80 ? "bg-emerald-500" : r.completion_rate >= 50 ? "bg-teal-500" : "bg-amber-400"}`}
                            style={{ width: `${r.completion_rate}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-500" data-no-i18n>{r.completion_rate}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-end" data-no-i18n>{r.in_progress}</td>
                    <td className="px-3 py-2 text-end" data-no-i18n>{r.pending}</td>
                    <td className={`px-3 py-2 text-end ${r.overdue ? "text-red-600 font-semibold" : ""}`} data-no-i18n>{r.overdue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
