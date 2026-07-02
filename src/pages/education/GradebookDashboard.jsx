import { useEffect, useState } from "react";
import { crossClassSummary, homeworkCompliance, coaching } from "../../api/gradebook";
import { Hero, Spinner } from "./lessonPlanUi";
import { PAPER, TEAL, BalanceBar, scoreColor, fmtScore } from "./gradebookUi";

/** Leadership panel: cross-class averages + 4D balance, homework compliance,
 *  and 4D-balance coaching signals. Reads served entirely from rollups. */
export default function GradebookDashboard() {
  const [cross, setCross] = useState(null);
  const [hw, setHw] = useState(null);
  const [coach, setCoach] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    Promise.all([
      crossClassSummary().then((r) => setCross(r.data)).catch((e) => { if (e.response?.status === 403) setForbidden(true); }),
      homeworkCompliance().then((r) => setHw(r.data)).catch(() => {}),
      coaching().then((r) => setCoach(r.data?.data || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ background: PAPER, minHeight: "100vh" }}><Spinner /></div>;
  if (forbidden) return <div style={{ background: PAPER, minHeight: "100vh" }} className="p-8 text-center text-sm text-gray-500">This panel is for leadership only.</div>;

  const o = cross?.overall || {};
  const s = hw?.stats || {};
  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

  return (
    <div style={{ background: PAPER, minHeight: "100vh" }} className="pb-10">
      <Hero title="Gradebook analytics" subtitle={`Monthly panel · ${cross?.month || ""}`} />
      <div className="max-w-4xl mx-auto px-4 py-4 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi label="Overall avg" value={fmtScore(o.avg)} color={scoreColor(o.avg)} />
          <Kpi label="Assessments" value={o.assessments || 0} />
          <Kpi label="Class·subjects" value={o.classes || 0} />
          <Kpi label="HW submission" value={`${pct(s.submitted, s.assigned)}%`} />
        </div>

        <Section title="Averages by class">
          {(cross?.classes || []).map((c, i) => (
            <div key={i} className="rounded-xl border bg-white p-3" style={{ borderColor: "#dbe8e8" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-700">{c.class_name} · {c.subject_name}</span>
                <span className="text-lg font-black tabular-nums" style={{ color: scoreColor(c.avg) }}>{fmtScore(c.avg)}</span>
              </div>
              <BalanceBar balance={c.balance} />
            </div>
          ))}
          {(cross?.classes || []).length === 0 && <p className="text-[11px] text-gray-400">No graded classes this month.</p>}
        </Section>

        {coach.length > 0 && (
          <Section title="Coaching suggestions">
            {coach.map((c) => (
              <div key={c.id} className="rounded-xl border p-3" style={{ borderColor: "#e7cf8f", background: "#fffaf0" }}>
                <p className="text-[11px] font-bold text-amber-800">Teacher #{c.teacher_id} · {c.year_month}</p>
                <p className="text-[11px] text-gray-600 mt-0.5">Grading is concentrated in one dimension ({c.reason?.replace("dominant:", "")}). Suggest a coaching session on 4D balance.</p>
              </div>
            ))}
          </Section>
        )}

        <Section title="Homework compliance">
          <div className="grid grid-cols-3 gap-3">
            <Kpi label="Assigned" value={s.assigned || 0} />
            <Kpi label="Submitted" value={`${pct(s.submitted, s.assigned)}%`} color="#2E7D5B" />
            <Kpi label="Reviewed" value={`${pct(s.reviewed, s.assigned)}%`} color={TEAL} />
          </div>
          {(hw?.waiting || []).length > 0 && (
            <div className="mt-2 space-y-1.5">
              <p className="text-[10px] font-bold uppercase text-gray-400">Waiting longest for review</p>
              {(hw.waiting || []).map((w, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg border bg-white text-[11px]" style={{ borderColor: "#eef3f3" }}>
                  <span className="text-gray-600">Teacher #{w.teacher_id}</span>
                  <span className="text-gray-400">{w.waiting_count} waiting · oldest {w.oldest ? new Date(w.oldest).toLocaleDateString() : "—"}</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function Kpi({ label, value, color = "#0D5C63" }) {
  return (
    <div className="rounded-2xl border bg-white p-4 text-center" style={{ borderColor: "#dbe8e8" }}>
      <p className="text-[10px] text-gray-400 font-bold uppercase">{label}</p>
      <p className="text-2xl font-black" style={{ color }}>{value}</p>
    </div>
  );
}
function Section({ title, children }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
