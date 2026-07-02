import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { assessmentFormData, classGradebook, listAssessments } from "../../api/gradebook";
import { Hero, Spinner } from "./lessonPlanUi";
import { PAPER, TEAL, GOLD, BalanceBar, scoreColor, fmtScore } from "./gradebookUi";

/** Class gradebook: pick a class+subject, see the monthly average, 4D balance,
 *  student list sorted by average, and the assessment list. */
export default function ClassGradebook() {
  const navigate = useNavigate();
  const [pairs, setPairs] = useState([]);
  const [sel, setSel] = useState(null);           // { school_class_id, subject_id, ... }
  const [data, setData] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    assessmentFormData()
      .then((r) => {
        const p = r.data?.pairs || [];
        setPairs(p);
        if (p.length) setSel(p[0]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!sel) return;
    setBusy(true);
    Promise.all([
      classGradebook(sel.school_class_id, sel.subject_id).then((r) => setData(r.data)).catch(() => setData(null)),
      listAssessments({ school_class_id: sel.school_class_id }).then((r) => setAssessments(r.data?.data || [])).catch(() => setAssessments([])),
    ]).finally(() => setBusy(false));
  }, [sel]);

  if (loading) return <div style={{ background: PAPER, minHeight: "100vh" }}><Spinner /></div>;

  const pairKey = (p) => `${p.school_class_id}:${p.subject_id}`;

  return (
    <div style={{ background: PAPER, minHeight: "100vh" }} className="pb-10">
      <Hero title="Gradebook" subtitle={data ? `${data.class?.name} · ${data.subject?.name}` : "Class grades"}
        right={sel && (
          <button onClick={() => navigate(`/education/gradebook/assessments/new?class=${sel.school_class_id}&subject=${sel.subject_id}`)}
            className="px-3 py-2 rounded-xl text-xs font-bold" style={{ background: GOLD, color: "#052528" }}>＋ Assessment</button>
        )} />

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {pairs.length === 0 ? (
          <Empty>No class/subject assigned to you yet. Ask an administrator to link you in Class Management.</Empty>
        ) : (
          <select value={sel ? pairKey(sel) : ""} onChange={(e) => setSel(pairs.find((p) => pairKey(p) === e.target.value))}
            className="w-full text-sm border rounded-xl px-3 py-2 bg-white" style={{ borderColor: "#dbe8e8" }}>
            {pairs.map((p) => <option key={pairKey(p)} value={pairKey(p)}>{p.class_name} · {p.subject_name}</option>)}
          </select>
        )}

        {busy && <Spinner />}

        {!busy && data && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border bg-white p-4" style={{ borderColor: "#dbe8e8" }}>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Monthly average</p>
                <p className="text-3xl font-black" style={{ color: scoreColor(data.summary?.avg) }}>{fmtScore(data.summary?.avg)}<span className="text-sm text-gray-400"> /10</span></p>
                <p className="text-[11px] text-gray-400 mt-1">{data.summary?.count || 0} grades · trend {data.summary?.trend || "—"}</p>
              </div>
              <div className="rounded-2xl border bg-white p-4" style={{ borderColor: "#dbe8e8" }}>
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">4D balance</p>
                <BalanceBar balance={data.balance} />
              </div>
            </div>

            <Section title={`Students (${data.students?.length || 0})`}>
              {(data.students || []).map((s) => (
                <button key={s.id} onClick={() => navigate(`/education/gradebook/student/${s.id}/subject/${sel.subject_id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border bg-white hover:bg-teal-50/40" style={{ borderColor: "#eef3f3" }}>
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: TEAL }}>{s.name?.[0]}</span>
                  <span className="flex-1 text-left text-xs font-semibold text-gray-700">{s.name}</span>
                  <span className="text-sm font-black tabular-nums" style={{ color: scoreColor(s.avg) }}>{fmtScore(s.avg)}</span>
                </button>
              ))}
              {(data.students || []).length === 0 && <p className="text-[11px] text-gray-400">No active students in this class.</p>}
            </Section>

            <Section title={`Assessments (${assessments.length})`}>
              {assessments.map((a) => (
                <button key={a.id} onClick={() => navigate(`/education/gradebook/mark?assessment=${a.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border bg-white hover:bg-teal-50/40" style={{ borderColor: "#eef3f3" }}>
                  <span className="flex-1 text-left">
                    <span className="text-xs font-bold text-gray-700">{a.title}</span>
                    <span className="block text-[10px] text-gray-400">{a.assessment_type?.replace("_", " ")} · {a.assessment_date}</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#e0f1f2", color: TEAL }}>{a.grades_count} graded</span>
                </button>
              ))}
              {assessments.length === 0 && <p className="text-[11px] text-gray-400">No assessments yet — create one to start grading.</p>}
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
function Empty({ children }) {
  return <div className="rounded-2xl border bg-white p-6 text-center text-xs text-gray-500" style={{ borderColor: "#dbe8e8" }}>{children}</div>;
}
