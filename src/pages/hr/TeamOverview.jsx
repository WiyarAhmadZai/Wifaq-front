import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { get } from "../../api/axios";
import { PageHeader, StatGrid, EmptyState, Spinner } from "../../components/hr/HrUI";

/**
 * Team Overview — the manager's view of Live Status (spec §2.6).
 *
 * Two lenses on the same data: Live Status (one card per open task, with its
 * last check-in and a red flag after 24h of silence) and Task Counts (a row
 * per person: inbox, today, overdue, blocked, stale).
 */
const LIVE = {
  on_track:    { label: "On track",  dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700", bar: "bg-teal-600" },
  at_risk:     { label: "At risk",   dot: "bg-amber-500",   chip: "bg-amber-50 text-amber-700",     bar: "bg-amber-500" },
  blocked:     { label: "Blocked",   dot: "bg-red-500",     chip: "bg-red-50 text-red-700",         bar: "bg-red-500" },
  done:        { label: "Done",      dot: "bg-teal-600",    chip: "bg-teal-50 text-teal-700",       bar: "bg-emerald-500" },
  not_started: { label: "No update", dot: "bg-gray-300",    chip: "bg-gray-100 text-gray-500",      bar: "bg-gray-300" },
};
const hm = (min) => { const m = Math.max(0, Math.round(min || 0)); return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60 ? `${m % 60}m` : ""}`.trim(); };
const ago = (iso) => {
  if (!iso) return null;
  const h = Math.floor((Date.now() - new Date(iso)) / 3600000);
  if (h < 1) return "less than an hour ago";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};
const FILTERS = [["all", "All"], ["blocked", "Blocked"], ["at_risk", "At risk"], ["stale", "Stale"]];

export default function TeamOverview() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("live");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    get("/hr/staff-tasks/team-board", { cache: false })
      .then((r) => setData(r.data))
      .catch((e) => Swal.fire("Error", e.response?.data?.message || "Could not load the team board.", "error"))
      .finally(() => setLoading(false));
  }, []);

  const tasks = useMemo(() => {
    if (!data) return [];
    const list = data.tasks;
    if (filter === "stale") return list.filter((t) => t.stale);
    if (filter !== "all") return list.filter((t) => t.live_status === filter);
    return list;
  }, [data, filter]);

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>;
  if (!data) return null;

  return (
    <div className="px-4 py-5 space-y-4">
      <PageHeader title="Team Overview" subtitle="Where every open task stands, and who has gone quiet" icon="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z" />

      <StatGrid stats={[
        { label: "On track", value: data.summary.on_track, tone: "emerald" },
        { label: "At risk", value: data.summary.at_risk, tone: "amber" },
        { label: "Blocked", value: data.summary.blocked, tone: "red" },
        { label: "No update in 24h", value: data.summary.stale, tone: "gray" },
      ]} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-0.5">
          <button onClick={() => setView("live")} className={`px-3 py-1.5 text-sm rounded-lg ${view === "live" ? "bg-teal-600 text-white" : "text-gray-600"}`}>Live status</button>
          <button onClick={() => setView("counts")} className={`px-3 py-1.5 text-sm rounded-lg ${view === "counts" ? "bg-teal-600 text-white" : "text-gray-600"}`}>Task counts</button>
        </div>
        {view === "live" && (
          <div className="flex gap-1 ms-auto">
            {FILTERS.map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} className={`px-2.5 py-1 text-xs rounded-full border ${filter === k ? "bg-gray-800 text-white border-gray-800" : "border-gray-200 text-gray-600 bg-white"}`}>{l}</button>
            ))}
          </div>
        )}
      </div>

      {view === "live" ? (
        tasks.length === 0 ? <EmptyState title="Nothing here" description="No open task matches this filter." /> : (
          <div className="space-y-2">
            {tasks.map((t) => {
              const live = LIVE[t.live_status] || LIVE.not_started;
              return (
                <div key={t.id} className={`rounded-2xl border bg-white p-4 ${t.live_status === "blocked" ? "border-red-200" : t.stale ? "border-amber-200" : "border-gray-200"}`}>
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{(t.staff_name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-800">{t.staff_name} — {t.task}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5 flex flex-wrap gap-x-3">
                        {t.deadline && <span className={t.overdue ? "text-red-600 font-semibold" : ""}><span>Deadline</span>: {t.deadline}</span>}
                        {(t.estimated_minutes || t.elapsed_minutes > 0) && <span>⏱ {hm(t.elapsed_minutes)}{t.estimated_minutes ? ` / ${hm(t.estimated_minutes)}` : ""}</span>}
                        {t.timer_running && <span className="text-emerald-600 font-semibold">● clock running</span>}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${live.chip}`}><span className={`w-2 h-2 rounded-full ${live.dot}`} />{live.label}</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden"><div className={`h-full ${live.bar}`} style={{ width: `${t.progress}%` }} /></div>
                  {t.last_update ? (
                    <div className="mt-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2" dir="auto">{t.last_update}{t.blocked_reason && <div className="text-red-700 mt-1">⛔ {t.blocked_reason}</div>}</div>
                  ) : (
                    <div className="mt-2 text-sm text-gray-400 italic">No check-in submitted yet</div>
                  )}
                  <div className={`mt-1.5 text-[11px] ${t.stale ? "text-red-600 font-semibold" : "text-gray-400"}`}>
                    {t.last_update_at ? <><span>Updated</span> {ago(t.last_update_at)}</> : <span>Never updated</span>}{t.stale && <> · <span>stale</span></>}
                  </div>
                  {t.live_status === "blocked" && <button onClick={() => navigate(`/hr/staff-task/show/${t.id}`)} className="mt-2 text-xs font-semibold text-red-700">Respond now →</button>}
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
              <tr><th className="text-start px-4 py-2.5">Staff</th><th className="px-3 py-2.5">Inbox</th><th className="px-3 py-2.5">Today</th><th className="px-3 py-2.5">Overdue</th><th className="px-3 py-2.5">Blocked</th><th className="px-3 py-2.5">Stale</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.per_staff.map((s) => (
                <tr key={s.staff_id}>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{s.staff_name}</td>
                  <td className="px-3 py-2.5 text-center">{s.inbox}</td>
                  <td className="px-3 py-2.5 text-center">{s.today}</td>
                  <td className="px-3 py-2.5 text-center">{s.overdue ? <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold">{s.overdue}</span> : 0}</td>
                  <td className="px-3 py-2.5 text-center">{s.blocked ? <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-bold">{s.blocked}</span> : 0}</td>
                  <td className="px-3 py-2.5 text-center">{s.stale ? <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">{s.stale}</span> : 0}</td>
                </tr>
              ))}
              {data.per_staff.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No open tasks across the team.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
