import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get, peekCache } from "../../api/axios";
import { fmtDate } from "../../utils/formErrors";
import { TEAL, TEAL_LT, GOLD, PAPER, Hero, Spinner, StatusPill, DimensionDots } from "./lessonPlanUi";

export default function LessonPlanDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const __cached = peekCache("/lesson-plans/dashboard");
    if (__cached) { setData(__cached); setLoading(false); }
    get("/lesson-plans/dashboard")
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ background: PAPER, minHeight: "100vh" }}><Spinner /></div>;

  const s = data?.stats;

  return (
    <div style={{ background: PAPER, minHeight: "100vh" }} className="pb-10">
      <Hero title="Lesson Planning" subtitle={data?.name ? `${data.name} · this week` : "Teacher workspace"}
        right={
          <button onClick={() => navigate("/education/lesson-plans/create")}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: GOLD, color: "#052528" }}>
            ＋ New plan
          </button>
        } />

      <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">
        {!data?.is_teacher ? (
          <div className="rounded-2xl border bg-white p-8 text-center" style={{ borderColor: "#dbe8e8" }}>
            <p className="text-sm font-bold text-gray-600">You don't have a teaching timetable.</p>
            <p className="text-xs text-gray-400 mt-1">Lesson planning is for teachers. Reviewers can open the Review Queue and Analytics.</p>
            <div className="flex gap-2 justify-center mt-4">
              <button onClick={() => navigate("/education/lesson-plans/review")} className="px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: TEAL }}>Review Queue</button>
              <button onClick={() => navigate("/education/lesson-plans/insights")} className="px-4 py-2 rounded-xl text-xs font-bold border" style={{ borderColor: "#dbe8e8", color: TEAL }}>Analytics</button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi label="Plans this week" value={s.plans_this_week} sub={`of ${s.weekly_periods} periods`} accent={TEAL_LT} />
              <Kpi label="Incomplete" value={s.incomplete} sub="need 4 dimensions" accent="#C98A27" />
              <Kpi label="4D balance" value={`${s.balance_pct}%`} sub="complete plans" accent="#2E7D5B" />
              <Kpi label="Reflections due" value={s.reflections_due} sub="after delivery" accent="#6b54a8" />
            </div>

            {(s.awaiting_review > 0 || s.returned > 0) && (
              <div className="flex flex-wrap gap-2">
                {s.awaiting_review > 0 && <Banner color="#9a6a12" bg="#fbf0db">{s.awaiting_review} plan(s) awaiting Department-Head review.</Banner>}
                {s.returned > 0 && <Banner color="#C0473F" bg="#f7e3e1">{s.returned} plan(s) returned for revision — open them to fix &amp; resubmit.</Banner>}
              </div>
            )}

            <div className="rounded-2xl border bg-white" style={{ borderColor: "#dbe8e8" }}>
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "#eef4f4" }}>
                <h3 className="text-sm font-black text-gray-800">Recent plans</h3>
                <button onClick={() => navigate("/education/lesson-plans/my")} className="text-[11px] font-bold" style={{ color: TEAL }}>View all →</button>
              </div>
              <div className="divide-y" style={{ borderColor: "#eef4f4" }}>
                {(data.recent || []).length === 0 ? (
                  <p className="p-6 text-center text-xs text-gray-400">No plans yet. Create your first 4D plan.</p>
                ) : data.recent.map((p) => (
                  <button key={p.id} onClick={() => navigate(`/education/lesson-plans/show/${p.id}`)}
                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 truncate">{p.title}</p>
                      <p className="text-[10px] text-gray-400">{p.subject} · {p.class} · {fmtDate(p.lesson_date)}</p>
                    </div>
                    <DimensionDots filled={p.dimensions_filled} />
                    <StatusPill status={p.status} />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const Kpi = ({ label, value, sub, accent }) => (
  <div className="rounded-2xl border bg-white p-4 relative overflow-hidden" style={{ borderColor: "#dbe8e8" }}>
    <span className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} />
    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
    <p className="text-2xl font-black text-gray-800 mt-1 leading-none">{value}</p>
    <p className="text-[10px] text-gray-400 mt-1">{sub}</p>
  </div>
);
const Banner = ({ children, color, bg }) => (
  <div className="rounded-xl px-3 py-2 text-[11px] font-semibold flex-1 min-w-[220px]" style={{ background: bg, color }}>{children}</div>
);
