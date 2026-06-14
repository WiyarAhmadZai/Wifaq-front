import { useState, useEffect } from "react";
import { get } from "../../api/axios";
import { TEAL, PAPER, DIMENSIONS, DAY_LABEL, Hero, Spinner } from "./lessonPlanUi";

/* 4D-balance cell colour — a coaching tool, never a score (guidelines §4.3). */
const balanceColor = (pct) => {
  if (pct >= 90) return { bg: "#2e7d5b", fg: "#fff" };
  if (pct >= 75) return { bg: "#5da380", fg: "#fff" };
  if (pct >= 60) return { bg: "#a1c8b0", fg: "#1c3a2b" };
  return { bg: "#d9b43e", fg: "#fff" }; // gold = coaching opportunity
};
const coverageColor = (missing) =>
  missing === 0 ? { bg: "#e6f3ec", fg: "#2E7D5B" } : missing <= 2 ? { bg: "#fbecd0", fg: "#9a6a12" } : { bg: "#f7e3e1", fg: "#C0473F" };

export default function LessonPlanInsights() {
  const [tab, setTab] = useState("balance");
  const [forbidden, setForbidden] = useState(false);

  return (
    <div style={{ background: PAPER, minHeight: "100vh" }} className="pb-10">
      <Hero title="Lesson Plan Analytics" subtitle="4D balance & coverage — where teachers and classes need support" />
      <div className="max-w-5xl mx-auto px-4 py-5">
        <div className="inline-flex gap-1 p-1 rounded-xl bg-white border mb-4" style={{ borderColor: "#dbe8e8" }}>
          {[["balance", "4D Balance"], ["coverage", "Coverage"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={tab === k ? { background: TEAL, color: "#fff" } : { color: "#6b7280" }}>{l}</button>
          ))}
        </div>
        {forbidden ? (
          <p className="text-sm text-gray-500 py-8 text-center">Analytics are for leadership.</p>
        ) : tab === "balance" ? <Balance onForbid={() => setForbidden(true)} /> : <Coverage onForbid={() => setForbidden(true)} />}
      </div>
    </div>
  );
}

function Balance({ onForbid }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    get(`/lesson-plans/analytics/balance?month=${month}`)
      .then((r) => setData(r.data))
      .catch((e) => { if (e.response?.status === 403) onForbid(); })
      .finally(() => setLoading(false));
  }, [month]);

  if (loading) return <Spinner />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="px-3 py-2 rounded-xl border text-sm bg-white" style={{ borderColor: "#dbe8e8" }} />
        <div className="text-xs text-gray-500">Overall balance <b style={{ color: TEAL }}>{data.overall}%</b> · weakest: <b className="capitalize" style={{ color: "#9a6a12" }}>{data.weakest || "—"}</b></div>
      </div>

      <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: "#dbe8e8" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#fafcfc" }}>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">Teacher</th>
              <th className="px-2 py-2.5 text-[10px] font-bold uppercase text-gray-400">Plans</th>
              {DIMENSIONS.map((d) => <th key={d.key} className="px-2 py-2.5 text-[10px] font-bold uppercase text-gray-400">{d.label.slice(0, 5)}.</th>)}
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-gray-400">No plans this month.</td></tr>
            ) : data.rows.map((r) => (
              <tr key={r.teacher_id} className="border-t" style={{ borderColor: "#eef4f4" }}>
                <td className="px-4 py-2.5 font-semibold text-gray-800">{r.teacher}</td>
                <td className="px-2 py-2.5 text-center text-gray-500">{r.plans}</td>
                {DIMENSIONS.map((d) => {
                  const c = balanceColor(r[d.key]);
                  return <td key={d.key} className="px-2 py-2.5 text-center font-bold" style={{ background: c.bg, color: c.fg }}>{r[d.key]}%</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-xl px-3 py-2 text-[11px]" style={{ background: "#E8F6F6", color: TEAL }}>
        This heatmap is for <b>help, not judgement</b>. Gold cells (&lt;60%) suggest a short coaching conversation with the Deputy of Instruction — never an automatic flag.
      </div>
    </div>
  );
}

function Coverage({ onForbid }) {
  const [week, setWeek] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    get(`/lesson-plans/analytics/coverage?week=${week}`)
      .then((r) => setData(r.data))
      .catch((e) => { if (e.response?.status === 403) onForbid(); })
      .finally(() => setLoading(false));
  }, [week]);

  if (loading) return <Spinner />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <input type="date" value={week} onChange={(e) => setWeek(e.target.value)} className="px-3 py-2 rounded-xl border text-sm bg-white" style={{ borderColor: "#dbe8e8" }} />
        <div className="text-xs text-gray-500">Week {data.week_start} → {data.week_end} · coverage <b style={{ color: TEAL }}>{data.overall}%</b> · <b style={{ color: "#C0473F" }}>{data.missing_total}</b> periods without an approved plan</div>
      </div>

      <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: "#dbe8e8" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#fafcfc" }}>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">Class</th>
              {data.days.map((d) => <th key={d} className="px-2 py-2.5 text-[10px] font-bold uppercase text-gray-400">{DAY_LABEL[d]}</th>)}
              <th className="px-2 py-2.5 text-[10px] font-bold uppercase text-gray-400">Cov.</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-xs text-gray-400">No active classes.</td></tr>
            ) : data.rows.map((r) => (
              <tr key={r.class_id} className="border-t" style={{ borderColor: "#eef4f4" }}>
                <td className="px-4 py-2 font-semibold text-gray-800">{r.class_name}</td>
                {data.days.map((d) => {
                  const cell = r.days[d];
                  if (!cell || cell.scheduled === 0) return <td key={d} className="px-2 py-2 text-center text-gray-300">·</td>;
                  const c = coverageColor(cell.missing);
                  return <td key={d} className="px-2 py-2 text-center font-bold" style={{ background: c.bg, color: c.fg }} title={`${cell.covered}/${cell.scheduled} planned`}>{cell.missing === 0 ? "✓" : cell.missing}</td>;
                })}
                <td className="px-2 py-2 text-center font-black" style={{ color: r.coverage >= 90 ? "#2E7D5B" : r.coverage >= 70 ? "#9a6a12" : "#C0473F" }}>{r.coverage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-4 text-[10px] text-gray-500">
        <span><span className="inline-block w-3 h-3 rounded mr-1 align-middle" style={{ background: "#e6f3ec" }} /> all planned</span>
        <span><span className="inline-block w-3 h-3 rounded mr-1 align-middle" style={{ background: "#fbecd0" }} /> 1–2 missing</span>
        <span><span className="inline-block w-3 h-3 rounded mr-1 align-middle" style={{ background: "#f7e3e1" }} /> 3+ missing</span>
      </div>
    </div>
  );
}
