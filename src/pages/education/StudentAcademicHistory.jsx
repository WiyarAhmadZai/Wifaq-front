import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { studentAcademicHistory } from "../../api/gradebook";
import { peekCache } from "../../api/axios";
import {
  Page, Header, Card, Avatar, Pill, EmptyState, Spinner, Loading, LoadingRow, ICON, scoreColor, fmtScore,
} from "./gradebookUi";

const OUTCOME = {
  promoted:  { label: "Promoted", tone: "emerald" },
  graduated: { label: "Graduated", tone: "purple" },
  retained:  { label: "Repeated", tone: "red" },
  reexam:    { label: "Re-exam", tone: "amber" },
};

/** Year-by-year academic record: per subject midterm/final/total/status + outcome. */
export default function StudentAcademicHistory() {
  const navigate = useNavigate();
  const { studentId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const __cached = peekCache(`/gradebook/promotion/student/${studentId}/history`);
    if (__cached) { setData(__cached); setLoading(false); }
    studentAcademicHistory(studentId).then((r) => setData(r.data)).catch(() => setData(null)).finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return <Loading />;
  if (!data) return <Page><Header icon={ICON.cap} title="Academic history" onBack={() => navigate(-1)} /><EmptyState title="Not available" /></Page>;

  return (
    <Page>
      <Header icon={ICON.cap} title={data.student?.name} subtitle="Term exams & promotion · year by year" onBack={() => navigate(-1)} />

      {(data.years || []).length === 0 && (
        <EmptyState icon={ICON.cap} title="No term-exam history yet"
          description="Once this student's term exams are entered, each year appears here with results and outcome." />
      )}

      <div className="space-y-4">
        {(data.years || []).map((y) => {
          const o = OUTCOME[y.outcome];
          const passed = (y.subjects || []).filter((s) => s.passed === true || (s.passed === false && s.reexam >= 40)).length;
          return (
            <Card key={y.term_id} pad={false}>
              <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-gray-100">
                <Avatar name={y.grade || "?"} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-teal-800 truncate">{y.term_name || `Year #${y.term_id}`}</p>
                  <p className="text-[11px] text-teal-700/70">{y.grade}{y.class ? ` · ${y.class}` : ""}</p>
                </div>
                {o && <Pill tone={o.tone}>{o.label}</Pill>}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="text-left px-5 py-2">Subject</th>
                      <th className="px-2 py-2">Mid /40</th>
                      <th className="px-2 py-2">Final /60</th>
                      <th className="px-2 py-2">Total</th>
                      <th className="px-2 py-2">Re-exam</th>
                      <th className="text-right px-5 py-2">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(y.subjects || []).map((sub, i) => (
                      <tr key={i} className="border-t border-gray-50 text-sm">
                        <td className="px-5 py-2.5 font-semibold text-gray-700">{sub.subject}{sub.flag ? " ⚠" : ""}</td>
                        <td className="px-2 py-2.5 text-center text-gray-600">{fmtScore(sub.midterm)}</td>
                        <td className="px-2 py-2.5 text-center text-gray-600">{fmtScore(sub.final)}</td>
                        <td className="px-2 py-2.5 text-center font-bold tabular-nums" style={{ color: scoreColor((sub.total / 100) * 10) }}>{fmtScore(sub.total)}</td>
                        <td className="px-2 py-2.5 text-center text-gray-600">{fmtScore(sub.reexam)}</td>
                        <td className="px-5 py-2.5 text-right">
                          {sub.passed === false && !(sub.reexam >= 40) ? <Pill tone="red">Fail</Pill>
                            : sub.passed || sub.reexam >= 40 ? <Pill tone="emerald">Pass</Pill>
                              : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    ))}
                    {(y.subjects || []).length === 0 && <tr><td colSpan={6} className="px-5 py-3 text-center text-sm text-gray-400">No term-exam scores recorded.</td></tr>}
                  </tbody>
                </table>
              </div>
              {(y.subjects || []).length > 0 && (
                <p className="text-[11px] text-gray-400 px-5 py-2 border-t border-gray-50">{passed}/{y.subjects.length} subjects passed{y.decision ? ` · decision: ${y.decision}` : ""}</p>
              )}
            </Card>
          );
        })}
      </div>
    </Page>
  );
}
