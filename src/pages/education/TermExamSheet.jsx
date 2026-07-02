import { useEffect, useState } from "react";
import { termExamFormData, termExamSheet, saveTermExam, TERM_EXAMS } from "../../api/gradebook";
import { Hero, Spinner } from "./lessonPlanUi";
import { PAPER, TEAL, scoreColor, fmtScore } from "./gradebookUi";

/** Enter the two year-defining term exams (midterm /40, final /60) + re-exam
 *  (/100) for a class+subject. One number per student; live total + Pass/Fail. */
export default function TermExamSheet() {
  const [meta, setMeta] = useState(null);
  const [pair, setPair] = useState(null);      // {school_class_id, subject_id, ...}
  const [termId, setTermId] = useState(null);
  const [exam, setExam] = useState("midterm"); // midterm | final | reexam
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    termExamFormData().then((r) => {
      setMeta(r.data);
      const p = r.data?.pairs || [];
      if (p.length) setPair(p[0]);
      const cur = (r.data?.terms || []).find((t) => t.is_current) || r.data?.terms?.[0];
      if (cur) setTermId(cur.id);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (pair && termId) loadSheet(); }, [pair, termId]); // eslint-disable-line

  function loadSheet() {
    setBusy(true); setErr("");
    termExamSheet({ class_id: pair.school_class_id, subject_id: pair.subject_id, term_id: termId })
      .then((r) => setRows((r.data?.data || []).map((x) => ({ ...x }))))
      .catch(() => setRows([]))
      .finally(() => setBusy(false));
  }

  const max = TERM_EXAMS.find((t) => t.key === exam)?.max || 100;
  const pairKey = (p) => `${p.school_class_id}:${p.subject_id}`;
  // Re-exam only applies to students who failed the two term exams.
  const visible = exam === "reexam" ? rows.filter((r) => r.passed === false) : rows;

  const setScore = (studentId, v) =>
    setRows((rs) => rs.map((r) => (r.student_id === studentId ? { ...r, [exam]: v } : r)));

  async function save() {
    setErr(""); setFlash("");
    // client-side range guard
    for (const r of visible) {
      const v = r[exam];
      if (v !== null && v !== "" && v !== undefined && (Number(v) < 0 || Number(v) > max)) {
        return setErr(`Scores must be between 0 and ${max}.`);
      }
    }
    setBusy(true);
    try {
      const scores = visible.map((r) => ({ student_id: r.student_id, score: r[exam] === "" ? null : r[exam] }));
      const res = await saveTermExam({ class_id: pair.school_class_id, subject_id: pair.subject_id, term_id: termId, exam, scores });
      setFlash(res.data?.message || "Saved.");
      loadSheet();
    } catch (e) {
      setErr(e.response?.data?.message || "Save failed.");
      setBusy(false);
    }
  }

  if (loading) return <div style={{ background: PAPER, minHeight: "100vh" }}><Spinner /></div>;

  const pairs = meta?.pairs || [];

  return (
    <div style={{ background: PAPER, minHeight: "100vh" }} className="pb-10">
      <Hero title="Term exams" subtitle="Midterm /40 · Final /60 · Re-exam /100" />
      {flash && <div className="sticky top-0 z-10 text-center text-xs font-bold text-white py-2" style={{ background: "#2E7D5B" }}>{flash}</div>}
      {err && <div className="sticky top-0 z-10 text-center text-xs font-bold text-white py-2" style={{ background: "#C0473F" }}>{err}</div>}

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
        {pairs.length === 0 ? (
          <Empty>No class &amp; subject assigned to you. An administrator links teachers in Class Management → Grade Subjects.</Empty>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <select value={pair ? pairKey(pair) : ""} onChange={(e) => setPair(pairs.find((p) => pairKey(p) === e.target.value))}
                className="text-sm border rounded-lg px-2 py-2 bg-white" style={{ borderColor: "#dbe8e8" }}>
                {pairs.map((p) => <option key={pairKey(p)} value={pairKey(p)}>{p.class_name} · {p.subject_name}</option>)}
              </select>
              <select value={termId || ""} onChange={(e) => setTermId(Number(e.target.value))}
                className="text-sm border rounded-lg px-2 py-2 bg-white" style={{ borderColor: "#dbe8e8" }}>
                {(meta?.terms || []).map((t) => <option key={t.id} value={t.id}>{t.name}{t.is_current ? " (current)" : ""}</option>)}
              </select>
            </div>

            <div className="flex gap-1.5">
              {TERM_EXAMS.map((t) => (
                <button key={t.key} onClick={() => setExam(t.key)}
                  className="flex-1 px-2 py-2 rounded-lg text-xs font-bold border"
                  style={exam === t.key ? { background: TEAL, color: "#fff", borderColor: TEAL } : { background: "#fff", color: TEAL, borderColor: "#dbe8e8" }}>
                  {t.label} <span className="opacity-70">/{t.max}</span>
                </button>
              ))}
            </div>

            {busy && <Spinner />}
            {!busy && (
              <>
                {exam === "reexam" && (
                  <p className="text-[11px] text-gray-500">Re-exam lists only students who failed the two term exams ({visible.length}).</p>
                )}
                <div className="rounded-xl border bg-white divide-y" style={{ borderColor: "#dbe8e8" }}>
                  {visible.map((r) => (
                    <div key={r.student_id} className="flex items-center gap-3 px-3 py-2">
                      <span className="flex-1 text-xs font-semibold text-gray-700">{r.name}</span>
                      {r.total != null && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: scoreColor((r.total / 100) * 10) }}>
                          total {fmtScore(r.total)}{r.passed === false ? " · FAIL" : r.passed ? " · PASS" : ""}{r.flag ? " ⚠" : ""}
                        </span>
                      )}
                      <input type="number" min="0" max={max} step="0.5"
                        value={r[exam] ?? ""} onChange={(e) => setScore(r.student_id, e.target.value)}
                        className="w-20 text-center text-sm border rounded-lg px-2 py-1.5" style={{ borderColor: "#dbe8e8" }} />
                    </div>
                  ))}
                  {visible.length === 0 && <div className="px-3 py-4 text-[11px] text-gray-400 text-center">No students to show.</div>}
                </div>

                <button onClick={save} disabled={busy || visible.length === 0}
                  className="w-full px-4 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ background: TEAL }}>
                  Save {TERM_EXAMS.find((t) => t.key === exam)?.label} scores
                </button>
                <p className="text-[10px] text-center text-gray-400">Leave a box empty to skip that student. Midterm below 16 shows ⚠ (warning only).</p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Empty({ children }) {
  return <div className="rounded-2xl border bg-white p-6 text-center text-xs text-gray-500" style={{ borderColor: "#dbe8e8" }}>{children}</div>;
}
