import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { createQuestionnaire, updateQuestionnaire, getQuestionnaire } from "../../api/questionnaires";
import { DateField } from "../../components/hr/HrUI";

const input = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500";
const label = "block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1";

const blankQuestion = (type = "choice") => ({
  text: "",
  type,
  options: type === "choice" ? ["همیشه", "بیشتر اوقات", "گاهی", "هرگز"] : [],
});

export default function QuestionnaireForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", topic: "", description: "", week_of: "", is_public: true });
  const [questions, setQuestions] = useState([blankQuestion()]);

  useEffect(() => {
    if (!isEdit) return;
    getQuestionnaire(id).then((r) => {
      const q = r.data?.data;
      if (q) {
        setForm({ title: q.title || "", topic: q.topic || "", description: q.description || "", week_of: q.week_of?.slice(0, 10) || "", is_public: q.is_public ?? true });
        setQuestions((q.questions || []).length ? q.questions.map((qq) => ({
          text: qq.text, type: qq.type,
          options: qq.type === "choice" ? (qq.options || []).map((o) => o.text) : [],
        })) : [blankQuestion()]);
      }
    }).catch(() => Swal.fire("Error", "Could not load.", "error")).finally(() => setLoading(false));
  }, [id]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const updQ = (i, patch) => setQuestions((qs) => qs.map((q, idx) => idx === i ? { ...q, ...patch } : q));
  const changeType = (i, type) => updQ(i, { type, options: type === "choice" ? (questions[i].options.length ? questions[i].options : ["همیشه", "بیشتر اوقات", "گاهی", "هرگز"]) : [] });
  const setOpt = (qi, oi, val) => setQuestions((qs) => qs.map((q, idx) => idx === qi ? { ...q, options: q.options.map((o, j) => j === oi ? val : o) } : q));
  const addOpt = (qi) => setQuestions((qs) => qs.map((q, idx) => idx === qi ? { ...q, options: [...q.options, ""] } : q));
  const removeOpt = (qi, oi) => setQuestions((qs) => qs.map((q, idx) => idx === qi ? { ...q, options: q.options.filter((_, j) => j !== oi) } : q));

  const save = async (publish) => {
    if (!form.title.trim()) { Swal.fire("Title required", "Give the questionnaire a title.", "warning"); return; }
    const clean = questions
      .filter((q) => q.text.trim())
      .map((q) => ({ text: q.text, type: q.type, options: q.type === "choice" ? q.options.filter((o) => o.trim()) : [] }));
    if (clean.length === 0) { Swal.fire("Add a question", "Add at least one question.", "warning"); return; }

    setSaving(true);
    try {
      const payload = { ...form, status: publish ? "published" : "draft", questions: clean };
      if (isEdit) await updateQuestionnaire(id, payload);
      else await createQuestionnaire(payload);
      Swal.fire({ icon: "success", title: publish ? "Published" : "Saved", timer: 1400, showConfirmButton: false });
      navigate("/questionnaires");
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not save.", "error");
    } finally { setSaving(false); }
  };

  if (loading) return <div className="py-20 text-center"><div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent" /></div>;

  return (
    <div className="px-4 py-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-800">{isEdit ? "Edit" : "New"} Questionnaire</h1>
        <button onClick={() => navigate("/questionnaires")} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><label className={label}>Title</label><input className={input} value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="پرسشنامه ارزیابی موضوع هفته: …" /></div>
          <div><label className={label}>Topic</label><input className={input} value={form.topic} onChange={(e) => setField("topic", e.target.value)} placeholder="احترام" /></div>
          <div><label className={label}>Week of</label><DateField name="week_of" value={form.week_of} onChange={(e) => setField("week_of", e.target.value)} className={input} /></div>
          <div className="sm:col-span-2"><label className={label}>Description</label><textarea className={input} rows={2} value={form.description} onChange={(e) => setField("description", e.target.value)} /></div>
          <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={form.is_public} onChange={(e) => setField("is_public", e.target.checked)} /> Show on the public link</label>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {questions.map((q, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start gap-2 mb-2">
              <span className="text-xs font-bold text-gray-400 mt-2">{i + 1}.</span>
              <input className={input} value={q.text} onChange={(e) => updQ(i, { text: e.target.value })} placeholder="Question text…" />
              <select className="px-2 py-2 border border-gray-200 rounded-lg text-xs" value={q.type} onChange={(e) => changeType(i, e.target.value)}>
                <option value="choice">Multiple choice</option>
                <option value="yesno">Yes / No</option>
                <option value="text">Short answer</option>
                <option value="file">File / image upload</option>
              </select>
              {questions.length > 1 && <button onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))} className="text-red-500 text-xs font-semibold px-2 py-2">✕</button>}
            </div>

            {q.type === "choice" && (
              <div className="pl-6 space-y-1.5">
                <p className="text-[10px] text-gray-400">Options (top = best = 100%, bottom = 0%)</p>
                {q.options.map((o, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs" value={o} onChange={(e) => setOpt(i, oi, e.target.value)} placeholder={`Option ${oi + 1}`} />
                    {q.options.length > 1 && <button onClick={() => removeOpt(i, oi)} className="text-red-400 text-xs px-1">✕</button>}
                  </div>
                ))}
                <button onClick={() => addOpt(i)} className="text-[11px] font-semibold text-teal-600 hover:text-teal-800">+ Add option</button>
              </div>
            )}
            {q.type === "yesno" && <p className="pl-6 text-[11px] text-gray-400">Answers: بله (100%) / خیر (0%)</p>}
            {q.type === "text" && <p className="pl-6 text-[11px] text-gray-400">Free-text answer (not scored)</p>}
          </div>
        ))}
        <button onClick={() => setQuestions((qs) => [...qs, blankQuestion()])} className="text-xs font-semibold text-teal-600 hover:text-teal-800">+ Add question</button>
      </div>

      <div className="flex gap-2 mt-5">
        <button onClick={() => save(false)} disabled={saving} className="px-4 py-2.5 bg-white border border-teal-200 text-teal-700 text-sm font-semibold rounded-xl hover:bg-teal-50 disabled:opacity-50">{saving ? "Saving…" : "Save draft"}</button>
        <button onClick={() => save(true)} disabled={saving} className="px-4 py-2.5 bg-teal-600 text-white text-sm font-bold rounded-xl hover:bg-teal-700 disabled:opacity-50">{saving ? "Saving…" : "Save & publish"}</button>
      </div>
    </div>
  );
}
