import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAssessment, getQuestions, saveQuestions } from "../../api/gradebook";
import { Page, Header, Card, Btn, Banner, Input, Textarea, Select, Loading, ICON, Pill } from "./gradebookUi";

/**
 * The paper behind an assessment: write the questions, mark the right MCQ
 * option, set marks per question, and print it — a clean question sheet for
 * students, or the same sheet with the answers for the teacher.
 *
 * The whole list is saved in one go, so reordering and deleting need no extra
 * calls. Marks add up live; "Save" can set the assessment's score_max to that
 * total so the paper and the grade scale agree.
 */
const TYPE_LABEL = { mcq: "Multiple choice", short: "Short answer", long: "Long answer" };
const blank = (type = "short") => ({ type, prompt: "", options: type === "mcq" ? ["", "", "", ""] : [], correct_option: 0, answer: "", marks: 1 });
const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

export default function AssessmentQuestions() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meta, setMeta] = useState(null);
  const [qs, setQs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [sync, setSync] = useState(true);
  const [printMode, setPrintMode] = useState(null); // "paper" | "key"

  useEffect(() => {
    Promise.all([getAssessment(id), getQuestions(id)])
      .then(([a, q]) => { setMeta(a.data?.data); setQs((q.data?.data || []).map((x) => ({ ...x, options: x.options || [] }))); })
      .catch((e) => setErr(e.response?.data?.message || "Could not load the paper."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(""), 3500); return () => clearTimeout(t); }, [msg]);

  // Print: switch the page into a paper layout, print, switch back.
  useEffect(() => {
    if (!printMode) return;
    const t = setTimeout(() => { window.print(); setPrintMode(null); }, 50);
    return () => clearTimeout(t);
  }, [printMode]);

  const total = useMemo(() => qs.reduce((s, q) => s + (Number(q.marks) || 0), 0), [qs]);

  const patch = (i, p) => setQs((a) => a.map((q, k) => (k === i ? { ...q, ...p } : q)));
  const move = (i, d) => setQs((a) => { const b = [...a]; const j = i + d; if (j < 0 || j >= b.length) return a; [b[i], b[j]] = [b[j], b[i]]; return b; });
  const remove = (i) => setQs((a) => a.filter((_, k) => k !== i));
  const setType = (i, type) => patch(i, { type, options: type === "mcq" ? (qs[i].options?.length ? qs[i].options : ["", "", "", ""]) : [] });

  async function save() {
    setErr(""); setMsg("");
    for (const [i, q] of qs.entries()) {
      if (!q.prompt.trim()) return setErr(<><span>Question</span> {i + 1}: <span>the question text is empty.</span></>);
    }
    setBusy(true);
    try {
      const res = await saveQuestions(id, { questions: qs, sync_score_max: sync });
      setMsg(res.data?.message || "Saved.");
      if (res.data?.score_max != null) setMeta((m) => ({ ...m, score_max: res.data.score_max }));
    } catch (e) {
      setErr(e.response?.data?.message || "Could not save.");
    } finally { setBusy(false); }
  }

  if (loading) return <Loading />;
  if (!meta) return <Page><Header icon={ICON.check} title="Questions" onBack={() => navigate(-1)} />{err && <Banner kind="error">{err}</Banner>}</Page>;

  if (printMode) return <PrintSheet meta={meta} qs={qs} withKey={printMode === "key"} total={total} />;

  return (
    <Page>
      <Header icon={ICON.check} title={meta.title} subtitle={`${meta.class_name || ""} · ${meta.subject_name || ""}`} onBack={() => navigate(`/education/gradebook/assessments/${id}`)} />
      {msg && <Banner kind="success" onClose={() => setMsg("")}>{msg}</Banner>}
      {err && <Banner kind="error" onClose={() => setErr("")}>{err}</Banner>}

      <Card className="mb-3">
        <div className="flex flex-wrap items-center gap-3">
          <Pill tone="teal"><span>{qs.length}</span> <span>questions</span></Pill>
          <Pill tone="gray"><span>Total marks</span> {total}</Pill>
          <Pill tone="gray"><span>Grade scale</span> {meta.score_max}</Pill>
          <label className="flex items-center gap-1.5 text-xs text-gray-600 ms-auto">
            <input type="checkbox" checked={sync} onChange={(e) => setSync(e.target.checked)} className="rounded" />
            <span>Set grade scale to total marks</span>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn tone="ghost" onClick={() => setPrintMode("paper")} disabled={!qs.length}>Print question paper</Btn>
          <Btn tone="ghost" onClick={() => setPrintMode("key")} disabled={!qs.length}>Print answer key</Btn>
          <div className="ms-auto"><Btn onClick={save} disabled={busy}>{busy ? "Saving…" : "Save questions"}</Btn></div>
        </div>
      </Card>

      {qs.map((q, i) => (
        <Card key={i} className="mb-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white font-bold flex items-center justify-center shrink-0">{i + 1}</div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Select value={q.type} onChange={(e) => setType(i, e.target.value)}>
                  {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
                <Input type="number" min="0" step="0.5" value={q.marks} onChange={(e) => patch(i, { marks: e.target.value })} placeholder="Marks" />
                <div className="flex gap-1 justify-end">
                  <Btn tone="ghost" size="sm" onClick={() => move(i, -1)} disabled={i === 0}>↑</Btn>
                  <Btn tone="ghost" size="sm" onClick={() => move(i, 1)} disabled={i === qs.length - 1}>↓</Btn>
                  <Btn tone="danger" size="sm" onClick={() => remove(i)}>Remove</Btn>
                </div>
              </div>
              <Textarea rows={2} value={q.prompt} onChange={(e) => patch(i, { prompt: e.target.value })} placeholder="Write the question…" dir="auto" />

              {q.type === "mcq" ? (
                <div className="space-y-1.5">
                  {q.options.map((o, k) => (
                    <div key={k} className="flex items-center gap-2">
                      <input type="radio" name={`correct-${i}`} checked={q.correct_option === k} onChange={() => patch(i, { correct_option: k })} title="Correct answer" />
                      <span className="w-5 text-xs font-bold text-gray-400">{LETTERS[k]}</span>
                      <Input value={o} onChange={(e) => patch(i, { options: q.options.map((x, j) => (j === k ? e.target.value : x)) })} placeholder="Option" dir="auto" />
                      {q.options.length > 2 && <Btn tone="ghost" size="sm" onClick={() => patch(i, { options: q.options.filter((_, j) => j !== k), correct_option: Math.min(q.correct_option, q.options.length - 2) })}>✕</Btn>}
                    </div>
                  ))}
                  {q.options.length < 8 && <Btn tone="ghost" size="sm" onClick={() => patch(i, { options: [...q.options, ""] })}>+ Add option</Btn>}
                  <p className="text-[11px] text-gray-400">Tick the correct option — it only appears on the answer key.</p>
                </div>
              ) : (
                <Textarea rows={q.type === "long" ? 3 : 1} value={q.answer || ""} onChange={(e) => patch(i, { answer: e.target.value })} placeholder="Model answer (optional, answer key only)" dir="auto" />
              )}
            </div>
          </div>
        </Card>
      ))}

      <Card>
        <div className="flex flex-wrap gap-2 justify-center">
          <Btn tone="ghost" onClick={() => setQs((a) => [...a, blank("mcq")])}>+ Multiple choice</Btn>
          <Btn tone="ghost" onClick={() => setQs((a) => [...a, blank("short")])}>+ Short answer</Btn>
          <Btn tone="ghost" onClick={() => setQs((a) => [...a, blank("long")])}>+ Long answer</Btn>
        </div>
        {qs.length === 0 && <p className="text-center text-sm text-gray-400 mt-3">No questions yet — add the first one above.</p>}
      </Card>
    </Page>
  );
}

/** The printable sheet. Rendered alone (no app chrome) while printing. */
function PrintSheet({ meta, qs, withKey, total }) {
  return (
    <div className="bg-white text-black p-8 max-w-3xl mx-auto text-[13px] leading-relaxed" dir="auto">
      <style>{`@media print { body { background: white; } aside, header, nav { display: none !important; } }`}</style>
      <div className="border-b-2 border-black pb-3 mb-4">
        <div className="flex justify-between items-end">
          <div>
            <div className="text-lg font-bold">{meta.title}</div>
            <div className="text-gray-700">{meta.class_name} · {meta.subject_name}{meta.assessment_date ? ` · ${meta.assessment_date}` : ""}</div>
          </div>
          <div className="text-right">
            <div><span>Total marks</span>: <b>{total}</b></div>
            {withKey && <div className="font-bold text-red-700 uppercase tracking-wide">Answer key</div>}
          </div>
        </div>
        {!withKey && <div className="mt-3 flex gap-8"><span>Name: ____________________</span><span>Class: ________</span><span>Date: ________</span></div>}
      </div>

      <ol className="space-y-4">
        {qs.map((q, i) => (
          <li key={i} className="break-inside-avoid">
            <div className="flex justify-between gap-4">
              <div className="font-semibold"><span>{i + 1}.</span> {q.prompt}</div>
              <div className="text-gray-600 whitespace-nowrap">[{q.marks}]</div>
            </div>
            {q.type === "mcq" && (
              <ol className="mt-1 ms-6 space-y-0.5">
                {q.options.map((o, k) => (
                  <li key={k} className={withKey && q.correct_option === k ? "font-bold text-emerald-700" : ""}>
                    {LETTERS[k]}) {o}{withKey && q.correct_option === k ? " ✓" : ""}
                  </li>
                ))}
              </ol>
            )}
            {q.type !== "mcq" && !withKey && <div className={`mt-2 border-b border-dotted border-gray-400 ${q.type === "long" ? "h-24" : "h-8"}`} />}
            {q.type !== "mcq" && withKey && q.answer && <div className="mt-1 ms-6 text-emerald-700"><span>Answer</span>: {q.answer}</div>}
          </li>
        ))}
      </ol>
    </div>
  );
}
