import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getTags, getAssessment, homeworkSubmission, saveGrade,
} from "../../api/gradebook";
import { Hero, Spinner } from "./lessonPlanUi";
import { PAPER, TEAL, GOLD, GradeSlider, DimensionPicker, TagPicker, fmtScore } from "./gradebookUi";

/**
 * The marking screen — speed-first. Two modes:
 *   ?assessment=ID  → grade the pending roster, Save & next.
 *   ?submission=ID  → grade one homework submission.
 */
export default function MarkingScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const assessmentId = params.get("assessment");
  const submissionId = params.get("submission");

  const [tags, setTags] = useState({});
  const [loading, setLoading] = useState(true);
  const [ctx, setCtx] = useState(null);          // { title, score_max } header
  const [queue, setQueue] = useState([]);        // [{ student_id, name, submission_id? }]
  const [idx, setIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [err, setErr] = useState("");
  const [flash, setFlash] = useState("");        // transient "Saved ✓" banner
  const [graded, setGraded] = useState(0);       // how many saved this session
  const [done, setDone] = useState(false);

  // per-student form
  const [score, setScore] = useState(7);
  const [dimension, setDimension] = useState("intellectual");
  const [tagId, setTagId] = useState(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    getTags().then((r) => setTags(r.data?.data || {})).catch(() => {});
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(""), 2500);
    return () => clearTimeout(t);
  }, [flash]);

  useEffect(() => {
    setLoading(true);
    const load = assessmentId
      ? getAssessment(assessmentId).then((r) => {
          const a = r.data?.data;
          const max = parseFloat(a.score_max) || 10;
          setCtx({ id: a.id, title: a.title, score_max: max, primary: a.primary_dimension, mode: "assessment" });
          setDimension(a.primary_dimension || "intellectual");
          setScore(Math.round(max * 0.7 * 2) / 2);
          setQueue((r.data?.pending || []).map((s) => ({ student_id: s.id, name: `${s.first_name} ${s.last_name}` })));
        })
      : homeworkSubmission(submissionId).then((r) => {
          const s = r.data?.data;
          setCtx({ title: `Homework — ${s.assignment?.subject?.subject_name || ""}`, score_max: 10, mode: "homework", parentNote: s.submission_note, photo: s.photo_url });
          setQueue([{ student_id: s.student_id, name: `${s.student?.first_name} ${s.student?.last_name}`, submission_id: s.id }]);
        });
    load.catch(() => setErr("Could not load the marking queue.")).finally(() => setLoading(false));
  }, [assessmentId, submissionId]);

  const current = queue[idx];
  const scoreMax = ctx?.score_max || 10;
  const canSave = current && tagId && score != null && !saving;

  const resetForm = () => {
    setTagId(null); setNote(""); setSuggestions([]);
    setScore(Math.round(scoreMax * 0.7 * 2) / 2);
    if (ctx?.primary) setDimension(ctx.primary);
  };

  async function handleSave() {
    if (!canSave) return;
    setSaving(true); setErr("");
    try {
      const payload = {
        student_id: current.student_id,
        score, score_max: scoreMax,
        dimension, qualitative_tag_id: tagId,
        teacher_note: note || null,
      };
      if (current.submission_id) payload.homework_submission_id = current.submission_id;
      else payload.assessment_id = ctx.id;

      const r = await saveGrade(payload);
      setGraded((g) => g + 1);
      setFlash(`Saved ✓  ${current.name} · ${fmtScore(score)}/${fmtScore(scoreMax)}`);
      const sugg = r.data?.suggestions || [];
      if (sugg.length) { setSuggestions(sugg); setSaving(false); return; }
      advance();
    } catch (e) {
      setErr(e.response?.data?.message || "Save failed — the grade was not recorded.");
      setSaving(false);
    }
  }

  function advance() {
    setSaving(false);
    if (idx + 1 >= queue.length) setDone(true);
    else { setIdx((i) => i + 1); resetForm(); }
  }

  function skip() {
    if (idx + 1 >= queue.length) setDone(true);
    else { setIdx((i) => i + 1); resetForm(); }
  }

  if (loading) return <div style={{ background: PAPER, minHeight: "100vh" }}><Spinner /></div>;

  // ── Completion screen — the clear "you're finished" signal ──
  if (done) {
    return (
      <div style={{ background: PAPER, minHeight: "100vh" }}>
        <Hero title="Grading complete" subtitle={ctx?.title} />
        <div className="max-w-md mx-auto px-4 py-12 text-center">
          <div className="text-5xl mb-3">✅</div>
          <p className="text-lg font-black text-gray-700">{graded} grade{graded === 1 ? "" : "s"} saved</p>
          <p className="text-xs text-gray-400 mt-1">Each is now in the gradebook and the student's history.</p>
          <div className="flex gap-2 justify-center mt-6">
            <button onClick={() => navigate("/education/gradebook")} className="px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: TEAL }}>Open gradebook</button>
            <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-xl text-xs font-bold border" style={{ borderColor: "#dbe8e8", color: TEAL }}>Back</button>
          </div>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div style={{ background: PAPER, minHeight: "100vh" }}>
        <Hero title="Marking" subtitle={ctx?.title} />
        <div className="max-w-md mx-auto px-4 py-10 text-center">
          <p className="text-sm font-bold text-gray-600">Everyone here is already graded.</p>
          <button onClick={() => navigate("/education/gradebook")} className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: TEAL }}>Open gradebook</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: PAPER, minHeight: "100vh" }} className="pb-10">
      <Hero title={`Marking · ${current.name}`} subtitle={`${ctx?.title} · student ${idx + 1} of ${queue.length}`} />

      {/* Sticky success/error banners so the teacher always knows the outcome. */}
      {flash && <div className="sticky top-0 z-10 text-center text-xs font-bold text-white py-2" style={{ background: "#2E7D5B" }}>{flash}</div>}
      {err && <div className="sticky top-0 z-10 text-center text-xs font-bold text-white py-2" style={{ background: "#C0473F" }}>{err}</div>}

      <div className="max-w-md mx-auto px-4 py-4 space-y-3">
        <div className="rounded-lg text-[11px] text-gray-500 bg-white border px-3 py-2" style={{ borderColor: "#dbe8e8" }}>
          Set a <b>score</b>, pick <b>one dimension</b> and <b>one tag</b>, then <b>Save</b>. Saving records this student's grade and moves to the next. Graded so far: <b>{graded}</b>.
        </div>

        {ctx?.mode === "homework" && (ctx.photo || ctx.parentNote) && (
          <div className="rounded-xl border bg-white p-3" style={{ borderColor: "#dbe8e8" }}>
            {ctx.photo && <img src={ctx.photo} alt="submission" className="w-full rounded-lg mb-2 max-h-56 object-contain" />}
            {ctx.parentNote && <p className="text-[11px] text-gray-600"><b>Note:</b> {ctx.parentNote}</p>}
          </div>
        )}

        <Card label={`Score out of ${fmtScore(scoreMax)}`}>
          <GradeSlider value={score} max={scoreMax} onChange={setScore} />
        </Card>

        <Card label={`Primary dimension${dimension ? "" : " · required"}`}>
          <DimensionPicker value={dimension} onChange={(d) => { setDimension(d); setTagId(null); }} />
        </Card>

        <Card label={`Qualitative tag${tagId ? "" : " · required"}`}>
          <TagPicker tags={tags} dimension={dimension} value={tagId} onChange={setTagId} />
        </Card>

        <Card label="Note to student / parent · optional">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2}
            className="w-full text-xs border rounded-lg px-2 py-1.5" style={{ borderColor: "#dbe8e8" }}
            placeholder="e.g. Exercise 7 has a small mistake. Good work overall!" />
        </Card>

        {suggestions.length > 0 && (
          <div className="rounded-xl border-2 p-3 space-y-2" style={{ borderColor: GOLD, background: "#fffaf0" }}>
            {suggestions.map((s, i) => (
              <div key={i} className="text-[11px] text-gray-700 font-semibold">💡 {s.message}</div>
            ))}
            <div className="text-[10px] text-gray-400">Grade saved. Act on the suggestion from the VATS / Observation modules, then continue.</div>
            <button onClick={advance} className="w-full px-3 py-2 rounded-lg text-xs font-bold text-white" style={{ background: TEAL }}>Continue →</button>
          </div>
        )}

        {suggestions.length === 0 && (
          <>
            <div className="flex gap-2">
              <button onClick={skip}
                className="flex-1 px-3 py-3 rounded-xl text-xs font-bold border" style={{ borderColor: "#dbe8e8", color: TEAL }}>
                Skip
              </button>
              <button onClick={handleSave} disabled={!canSave}
                className="flex-[2] px-3 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ background: TEAL }}>
                {saving ? "Saving…" : idx + 1 >= queue.length ? "Save & finish" : "Save & next →"}
              </button>
            </div>
            {!tagId && <p className="text-[10px] text-center text-gray-400">Pick a dimension and a tag to enable Save.</p>}
          </>
        )}
      </div>
    </div>
  );
}

function Card({ label, children }) {
  return (
    <div className="rounded-xl border bg-white p-3" style={{ borderColor: "#dbe8e8" }}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">{label}</p>
      {children}
    </div>
  );
}
