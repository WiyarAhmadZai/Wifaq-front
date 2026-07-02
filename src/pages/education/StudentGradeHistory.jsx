import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { studentSubject } from "../../api/gradebook";
import { Hero, Spinner } from "./lessonPlanUi";
import { PAPER, GOLD, DIMAP, scoreColor, fmtScore } from "./gradebookUi";

/** One student's grade history in a subject — period summary + recent assessments. */
export default function StudentGradeHistory() {
  const navigate = useNavigate();
  const { studentId, subjectId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentSubject(studentId, subjectId)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [studentId, subjectId]);

  if (loading) return <div style={{ background: PAPER, minHeight: "100vh" }}><Spinner /></div>;
  if (!data) return <div style={{ background: PAPER, minHeight: "100vh" }} className="p-8 text-center text-sm text-gray-500">Not available.</div>;

  const ps = data.period_summary || {};
  return (
    <div style={{ background: PAPER, minHeight: "100vh" }} className="pb-10">
      <Hero title={data.student?.name} subtitle={`${data.subject?.name} · ${data.month}`}
        right={<button onClick={() => navigate(`/education/gradebook/student/${studentId}/academic-history`)}
          className="px-3 py-2 rounded-xl text-xs font-bold" style={{ background: GOLD, color: "#052528" }}>Academic history →</button>} />
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Month avg" value={fmtScore(ps.avg)} color={scoreColor(ps.avg)} />
          <Stat label="Count" value={ps.count || 0} />
          <Stat label="Trend" value={ps.trend === "up" ? "▲" : ps.trend === "down" ? "▼" : "▬"} />
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Recent assessments</p>
          <div className="space-y-2">
            {(data.grades || []).map((g) => {
              const dim = DIMAP[g.dimension];
              return (
                <div key={g.id} className="rounded-xl border bg-white p-3" style={{ borderColor: "#dbe8e8", borderLeft: `4px solid ${dim?.color || "#ccc"}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold" style={{ color: dim?.color }}>{g.assessment?.assessment_type?.replace("_", " ")} · {g.assessment?.assessment_date}</p>
                      <p className="text-sm font-bold text-gray-700">{g.assessment?.title}</p>
                      <p className="text-[11px] text-gray-500">{g.qualitative_tag?.name_en} · {dim?.label}</p>
                    </div>
                    <span className="text-xl font-black tabular-nums" style={{ color: scoreColor((g.score / g.score_max) * 10) }}>{fmtScore(g.score)}</span>
                  </div>
                  {g.teacher_note && <p className="mt-2 text-[11px] text-gray-600 bg-teal-50/50 rounded px-2 py-1">“{g.teacher_note}”</p>}
                </div>
              );
            })}
            {(data.grades || []).length === 0 && <p className="text-[11px] text-gray-400">No grades in this subject yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color = "#0D5C63" }) {
  return (
    <div className="rounded-2xl border bg-white p-4 text-center" style={{ borderColor: "#dbe8e8" }}>
      <p className="text-[10px] text-gray-400 font-bold uppercase">{label}</p>
      <p className="text-2xl font-black" style={{ color }}>{value}</p>
    </div>
  );
}
