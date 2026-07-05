import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { studentSubject } from "../../api/gradebook";
import {
  Page, Header, Card, StatGrid, Pill, Btn, EmptyState, Spinner, ICON, DIMAP, scoreColor, fmtScore,
} from "./gradebookUi";

/** One student's grade history in a subject — period summary + recent assessments. */
export default function StudentGradeHistory() {
  const navigate = useNavigate();
  const { studentId, subjectId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentSubject(studentId, subjectId).then((r) => setData(r.data)).catch(() => setData(null)).finally(() => setLoading(false));
  }, [studentId, subjectId]);

  if (loading) return <Page><Spinner /></Page>;
  if (!data) return <Page><Header icon={ICON.book} title="Grade history" onBack={() => navigate(-1)} /><EmptyState title="Not available" /></Page>;

  const ps = data.period_summary || {};
  return (
    <Page>
      <Header icon={ICON.book} title={data.student?.name} subtitle={`${data.subject?.name} · ${data.month}`} onBack={() => navigate(-1)}
        actions={<Btn tone="white" onClick={() => navigate(`/education/gradebook/student/${studentId}/academic-history`)}>Academic history →</Btn>} />

      <StatGrid stats={[
        { label: "Month average", value: fmtScore(ps.avg), tone: "teal", hint: `${ps.count || 0} grades` },
        { label: "Count", value: ps.count || 0, tone: "blue" },
        { label: "Trend", value: ps.trend === "up" ? "▲ up" : ps.trend === "down" ? "▼ down" : "▬ stable", tone: ps.trend === "up" ? "emerald" : ps.trend === "down" ? "red" : "gray" },
      ]} />

      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2 px-1">Recent assessments</p>
      {(data.grades || []).length === 0 && <EmptyState icon={ICON.book} title="No grades in this subject yet" />}

      <div className="space-y-3">
        {(data.grades || []).map((g) => {
          const dim = DIMAP[g.dimension];
          return (
            <Card key={g.id} accent={dim?.color}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold capitalize" style={{ color: dim?.color }}>{g.assessment?.assessment_type?.replace("_", " ")} · {g.assessment?.assessment_date}</p>
                  <p className="text-sm font-bold text-gray-800 truncate">{g.assessment?.title}</p>
                  <div className="mt-1"><Pill tone="gray">{g.qualitative_tag?.name_en} · {dim?.label}</Pill></div>
                </div>
                <span className="text-2xl font-black tabular-nums" style={{ color: scoreColor((g.score / g.score_max) * 10) }}>{fmtScore(g.score)}</span>
              </div>
              {g.teacher_note && <p className="mt-2 text-xs text-gray-600 bg-teal-50/60 rounded-lg px-3 py-2">“{g.teacher_note}”</p>}
            </Card>
          );
        })}
      </div>
    </Page>
  );
}
