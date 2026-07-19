import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAssessment } from "../../api/gradebook";
import { peekCache } from "../../api/axios";
import {
  Page, Header, Card, Avatar, Pill, Btn, SearchBox, EmptyState, Loading,
  ICON, scoreColor, fmtScore,
} from "./gradebookUi";

/** One assessment: its student roster + who's graded. Grade opens the marking screen. */
export default function AssessmentDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [students, setStudents] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  function load() {
    const cached = peekCache(`/gradebook/assessments/${id}`);
    if (cached) { setData(cached.data); setStudents(cached.students || []); setPending(cached.pending || []); setLoading(false); }
    getAssessment(id).then((r) => { setData(r.data?.data); setStudents(r.data?.students || []); setPending(r.data?.pending || []); })
      .catch(() => setData(null)).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, [id]); // eslint-disable-line

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? students.filter((s) => (s.name || "").toLowerCase().includes(q)) : students;
  }, [students, search]);

  if (loading) return <Loading />;
  if (!data) return <Page><Header icon={ICON.check} title="Assessment" onBack={() => navigate(-1)} /><EmptyState title="Not available" /></Page>;

  const total = data.total_count || students.length;
  const graded = data.graded_count || students.filter((s) => s.graded).length;
  const pct = total ? Math.round((graded / total) * 100) : 0;
  const goGrade = () => navigate(`/education/gradebook/mark?assessment=${id}`);

  return (
    <Page>
      <Header icon={ICON.check} title={data.title} subtitle={`${data.class_name || ""} · ${data.subject_name || ""}`} onBack={() => navigate("/education/gradebook/assessments")} />

      {/* summary card */}
      <Card className="mb-3">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Pill tone="teal">{String(data.assessment_type || "").replace("_", " ")}</Pill>
          <Pill tone="gray">out of {fmtScore(data.score_max)}</Pill>
          {data.assessment_date && <span className="text-[11px] text-gray-400">📅 {data.assessment_date}</span>}
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mb-1">
          <span className="font-semibold">{graded} of {total} graded</span>
          <span>{pending.length} to grade</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
        {pending.length > 0 && (
          <div className="mt-3"><Btn tone="primary" size="lg" full onClick={goGrade}>{graded > 0 ? `Continue grading (${pending.length} left) →` : "Start grading →"}</Btn></div>
        )}
        {pending.length === 0 && <p className="text-xs text-emerald-600 font-semibold mt-3 text-center">✓ All students graded</p>}
      </Card>

      <div className="mb-3"><SearchBox value={search} onChange={setSearch} placeholder="Search a student by name…" /></div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
        {shown.map((s) => (
          <div key={s.id} className={`flex items-center gap-3 px-4 py-3 ${s.graded ? "" : "bg-amber-50/30"}`}>
            <Avatar name={s.name} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate">{s.name}</p>
              {s.graded
                ? <div className="flex items-center gap-1.5 mt-0.5">{s.tag && <Pill tone="gray">{s.tag}</Pill>}</div>
                : <span className="text-[11px] text-amber-600 font-semibold">Not graded yet</span>}
            </div>
            {s.graded
              ? <span className="text-lg font-black tabular-nums" style={{ color: scoreColor((s.score / s.score_max) * 10) }}>{fmtScore(s.score)}<span className="text-xs text-gray-300">/{fmtScore(s.score_max)}</span></span>
              : <Btn tone="primary" onClick={goGrade}>Grade →</Btn>}
          </div>
        ))}
        {shown.length === 0 && <div className="px-4 py-10 text-center text-sm text-gray-400">{search ? `No student matching “${search}”.` : "No students in this class."}</div>}
      </div>
      <p className="text-[11px] text-gray-400 mt-2 px-1">Amber rows aren't graded yet. Tap <b>Grade</b> (or the button above) to open the fast marking screen and score each student.</p>
    </Page>
  );
}
