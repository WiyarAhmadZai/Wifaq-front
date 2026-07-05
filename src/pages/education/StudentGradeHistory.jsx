import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { studentSubject } from "../../api/gradebook";
import {
  Page, Header, Card, StatGrid, Pill, Btn, EmptyState, Spinner, Loading, LoadingRow, ICON, DIMAP, scoreColor, fmtScore,
} from "./gradebookUi";

const TYPE_FILTERS = [
  { key: "all", label: "All", types: [] },
  { key: "homework", label: "Homework", types: ["homework"] },
  { key: "quiz", label: "Quizzes", types: ["short_quiz"] },
  { key: "exam", label: "Exams", types: ["monthly_exam", "term_exam"] },
  { key: "project", label: "Projects", types: ["project"] },
  { key: "activity", label: "Activities", types: ["class_activity"] },
];

/** One student's grade history in a subject — period summary + a per-type filter
 *  (isolate all homework, quizzes, exams…) so hundreds of grades stay analysable. */
export default function StudentGradeHistory() {
  const navigate = useNavigate();
  const { studentId, subjectId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    studentSubject(studentId, subjectId).then((r) => setData(r.data)).catch(() => setData(null)).finally(() => setLoading(false));
  }, [studentId, subjectId]);

  if (loading) return <Loading />;
  if (!data) return <Page><Header icon={ICON.book} title="Grade history" onBack={() => navigate(-1)} /><EmptyState title="Not available" /></Page>;

  const ps = data.period_summary || {};
  const all = data.grades || [];
  // Filter by assessment type so a teacher can isolate e.g. all homework.
  const match = TYPE_FILTERS.find((t) => t.key === typeFilter);
  const shown = typeFilter === "all" ? all : all.filter((g) => match.types.includes(g.assessment?.assessment_type));
  const shownAvg = shown.length
    ? (shown.reduce((s, g) => s + (g.score / g.score_max) * 10, 0) / shown.length)
    : null;

  return (
    <Page>
      <Header icon={ICON.book} title={data.student?.name} subtitle={`${data.subject?.name} · ${data.month}`} onBack={() => navigate(-1)}
        actions={<Btn tone="white" onClick={() => navigate(`/education/gradebook/student/${studentId}/academic-history`)}>Academic history →</Btn>} />

      <StatGrid stats={[
        { label: "Month average", value: fmtScore(ps.avg), tone: "teal", hint: `${ps.count || 0} grades` },
        { label: typeFilter === "all" ? "Total graded" : `${match.label} count`, value: shown.length, tone: "blue" },
        { label: typeFilter === "all" ? "Trend" : `${match.label} average`, value: typeFilter === "all" ? (ps.trend === "up" ? "▲ up" : ps.trend === "down" ? "▼ down" : "▬ stable") : fmtScore(shownAvg), tone: typeFilter === "all" ? (ps.trend === "up" ? "emerald" : ps.trend === "down" ? "red" : "gray") : "purple" },
      ]} />

      {/* Assessment-type filter — isolate homework, quizzes, exams, etc. */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {TYPE_FILTERS.map((t) => {
          const n = t.key === "all" ? all.length : all.filter((g) => t.types.includes(g.assessment?.assessment_type)).length;
          return (
            <button key={t.key} onClick={() => setTypeFilter(t.key)}
              className="px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors"
              style={typeFilter === t.key ? { background: "#0D5C63", color: "#fff", borderColor: "#0D5C63" } : { background: "#fff", color: "#0D5C63", borderColor: "#e5e7eb" }}>
              {t.label} {n > 0 && <span className="opacity-70">· {n}</span>}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2 px-1">
        {typeFilter === "all" ? "Assessments" : match.label} ({shown.length})
      </p>
      {shown.length === 0 && <EmptyState icon={ICON.book} title={typeFilter === "all" ? "No grades in this subject yet" : `No ${match.label.toLowerCase()} grades yet`} />}

      <div className="space-y-3">
        {shown.map((g) => {
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
