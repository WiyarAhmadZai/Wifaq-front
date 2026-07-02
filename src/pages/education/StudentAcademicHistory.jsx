import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { studentAcademicHistory } from "../../api/gradebook";
import { Hero, Spinner } from "./lessonPlanUi";
import { PAPER, scoreColor, fmtScore } from "./gradebookUi";

const OUTCOME = {
  promoted:  { label: "Promoted", bg: "#e6f3ec", fg: "#2E7D5B" },
  graduated: { label: "Graduated", bg: "#eee9f6", fg: "#6b54a8" },
  retained:  { label: "Repeated", bg: "#f7e3e1", fg: "#C0473F" },
  reexam:    { label: "Re-exam", bg: "#fbf0db", fg: "#9a6a12" },
};

/** Year-by-year academic record: per subject midterm/final/total/status + the
 *  promotion outcome. The "easy grade history" view. */
export default function StudentAcademicHistory() {
  const { studentId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentAcademicHistory(studentId)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return <div style={{ background: PAPER, minHeight: "100vh" }}><Spinner /></div>;
  if (!data) return <div style={{ background: PAPER, minHeight: "100vh" }} className="p-8 text-center text-sm text-gray-500">Not available.</div>;

  return (
    <div style={{ background: PAPER, minHeight: "100vh" }} className="pb-10">
      <Hero title={data.student?.name} subtitle="Academic history · term exams & promotion" />
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {(data.years || []).length === 0 && (
          <div className="rounded-2xl border bg-white p-6 text-center text-xs text-gray-500" style={{ borderColor: "#dbe8e8" }}>
            No term-exam history yet.
          </div>
        )}
        {(data.years || []).map((y) => {
          const o = OUTCOME[y.outcome];
          return (
            <div key={y.term_id} className="rounded-2xl border bg-white p-4" style={{ borderColor: "#dbe8e8" }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-black text-gray-700">{y.term_name || `Year #${y.term_id}`}</p>
                  <p className="text-[11px] text-gray-400">{y.grade}{y.class ? ` · ${y.class}` : ""}</p>
                </div>
                {o && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: o.bg, color: o.fg }}>{o.label}</span>}
              </div>

              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-gray-400">
                    <th className="text-left font-semibold py-1">Subject</th>
                    <th className="font-semibold">Mid /40</th>
                    <th className="font-semibold">Final /60</th>
                    <th className="font-semibold">Total</th>
                    <th className="font-semibold">Re-exam</th>
                    <th className="font-semibold">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {(y.subjects || []).map((sub, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: "#f0f4f4" }}>
                      <td className="py-1.5 text-gray-700 font-semibold">{sub.subject}{sub.flag ? " ⚠" : ""}</td>
                      <td className="text-center">{fmtScore(sub.midterm)}</td>
                      <td className="text-center">{fmtScore(sub.final)}</td>
                      <td className="text-center font-bold" style={{ color: scoreColor((sub.total / 100) * 10) }}>{fmtScore(sub.total)}</td>
                      <td className="text-center">{fmtScore(sub.reexam)}</td>
                      <td className="text-center font-bold" style={{ color: sub.passed === false ? "#C0473F" : sub.passed ? "#2E7D5B" : "#9aa7a8" }}>
                        {sub.passed === false ? "Fail" : sub.passed ? "Pass" : "—"}
                      </td>
                    </tr>
                  ))}
                  {(y.subjects || []).length === 0 && (
                    <tr><td colSpan={6} className="py-2 text-center text-gray-400">No term-exam scores recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
