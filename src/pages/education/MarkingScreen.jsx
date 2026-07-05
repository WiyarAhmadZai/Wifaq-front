import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getTags, getAssessment, homeworkSubmission, saveGrade } from "../../api/gradebook";
import {
  Page, Header, Card, Avatar, Btn, Banner, Field, Textarea, GradeSlider, DimensionPicker,
  TagPicker, EmptyState, Spinner, Loading, LoadingRow, ICON, fmtScore,
} from "./gradebookUi";

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
  const [ctx, setCtx] = useState(null);
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [err, setErr] = useState("");
  const [flash, setFlash] = useState("");
  const [graded, setGraded] = useState(0);
  const [done, setDone] = useState(false);

  const [score, setScore] = useState(7);
  const [dimension, setDimension] = useState("intellectual");
  const [tagId, setTagId] = useState(null);
  const [note, setNote] = useState("");

  useEffect(() => { getTags().then((r) => setTags(r.data?.data || {})).catch(() => {}); }, []);
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(""), 2500); return () => clearTimeout(t); }, [flash]);

  useEffect(() => {
    setLoading(true);
    const load = assessmentId
      ? getAssessment(assessmentId).then((r) => {
          const a = r.data?.data; const max = parseFloat(a.score_max) || 10;
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

  const resetForm = () => { setTagId(null); setNote(""); setSuggestions([]); setScore(Math.round(scoreMax * 0.7 * 2) / 2); if (ctx?.primary) setDimension(ctx.primary); };

  async function handleSave() {
    if (!canSave) return;
    setSaving(true); setErr("");
    try {
      const payload = { student_id: current.student_id, score, score_max: scoreMax, dimension, qualitative_tag_id: tagId, teacher_note: note || null };
      if (current.submission_id) payload.homework_submission_id = current.submission_id; else payload.assessment_id = ctx.id;
      const r = await saveGrade(payload);
      setGraded((g) => g + 1);
      setFlash(`Saved ✓  ${current.name} · ${fmtScore(score)}/${fmtScore(scoreMax)}`);
      const sugg = r.data?.suggestions || [];
      if (sugg.length) { setSuggestions(sugg); setSaving(false); return; }
      advance();
    } catch (e) { setErr(e.response?.data?.message || "Save failed — the grade was not recorded."); setSaving(false); }
  }
  function advance() { setSaving(false); if (idx + 1 >= queue.length) setDone(true); else { setIdx((i) => i + 1); resetForm(); } }
  function skip() { if (idx + 1 >= queue.length) setDone(true); else { setIdx((i) => i + 1); resetForm(); } }

  if (loading) return <Loading />;

  if (done) {
    return (
      <Page size="form">
        <Header icon={ICON.check} title="Grading complete" subtitle={ctx?.title} />
        <Card className="text-center py-10">
          <div className="text-5xl mb-3">✅</div>
          <p className="text-lg font-black text-gray-800">{graded} grade{graded === 1 ? "" : "s"} saved</p>
          <p className="text-sm text-gray-400 mt-1">Each is now in the gradebook and the student's history.</p>
          <div className="flex gap-2 justify-center mt-5">
            <Btn tone="primary" size="lg" onClick={() => navigate("/education/gradebook")}>Open gradebook</Btn>
            <Btn tone="outline" size="lg" onClick={() => navigate(-1)}>Back</Btn>
          </div>
        </Card>
      </Page>
    );
  }

  if (!current) {
    return (
      <Page size="form">
        <Header icon={ICON.check} title="Marking" subtitle={ctx?.title} onBack={() => navigate(-1)} />
        <EmptyState icon={ICON.check} title="Everyone here is already graded" action={<div className="mt-3"><Btn tone="primary" onClick={() => navigate("/education/gradebook")}>Open gradebook</Btn></div>} />
      </Page>
    );
  }

  const progress = Math.round((idx / queue.length) * 100);
  return (
    <Page size="form">
      <Header icon={ICON.check} title={`Marking · ${current.name}`} subtitle={`${ctx?.title} · student ${idx + 1} of ${queue.length}`} onBack={() => navigate(-1)} />
      {flash && <Banner onClose={() => setFlash("")}>{flash}</Banner>}
      {err && <Banner kind="error" onClose={() => setErr("")}>{err}</Banner>}

      <div className="h-1.5 rounded-full overflow-hidden bg-gray-200 mb-3">
        <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${progress}%` }} />
      </div>

      <Card className="flex items-center gap-3 mb-4">
        <Avatar name={current.name} size={40} />
        <div className="flex-1"><p className="text-sm font-bold text-gray-800">{current.name}</p><p className="text-[11px] text-gray-400">Graded so far: {graded}</p></div>
      </Card>

      <div className="space-y-4">
        {ctx?.mode === "homework" && (ctx.photo || ctx.parentNote) && (
          <Card>
            {ctx.photo && <img src={ctx.photo} alt="submission" className="w-full rounded-xl mb-2 max-h-64 object-contain" />}
            {ctx.parentNote && <p className="text-xs text-gray-600"><b>Note:</b> {ctx.parentNote}</p>}
          </Card>
        )}

        <Card><Field label={`Score out of ${fmtScore(scoreMax)}`}><GradeSlider value={score} max={scoreMax} onChange={setScore} /></Field></Card>
        <Card><Field label={`Dimension${dimension ? "" : " · required"}`}><DimensionPicker value={dimension} onChange={(d) => { setDimension(d); setTagId(null); }} /></Field></Card>
        <Card><Field label={`Qualitative tag${tagId ? "" : " · required"}`}><TagPicker tags={tags} dimension={dimension} value={tagId} onChange={setTagId} /></Field></Card>
        <Card><Field label="Note to student / parent · optional"><Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} placeholder="e.g. Exercise 7 has a small mistake. Good work overall!" /></Field></Card>

        {suggestions.length > 0 ? (
          <Card accent="#C9A227" className="bg-amber-50/40">
            {suggestions.map((s, i) => <p key={i} className="text-xs text-gray-700 font-semibold mb-1">💡 {s.message}</p>)}
            <p className="text-[11px] text-gray-400 mb-2">Grade saved. Act on it from the VATS / Observation modules, then continue.</p>
            <Btn tone="primary" full onClick={advance}>Continue →</Btn>
          </Card>
        ) : (
          <div className="sticky bottom-4">
            <div className="bg-white/90 backdrop-blur rounded-xl border border-gray-100 shadow-sm p-3 flex gap-2">
              <Btn tone="ghost" size="lg" onClick={skip}>Skip</Btn>
              <div className="flex-1"><Btn tone="primary" size="lg" full onClick={handleSave} disabled={!canSave}>{saving ? "Saving…" : idx + 1 >= queue.length ? "Save & finish" : "Save & next →"}</Btn></div>
            </div>
            {!tagId && <p className="text-[11px] text-center text-gray-400 mt-1.5">Pick a dimension and a tag to enable Save.</p>}
          </div>
        )}
      </div>
    </Page>
  );
}
