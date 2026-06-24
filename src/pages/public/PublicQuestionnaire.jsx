import { useEffect, useState } from "react";
import { get, post } from "../../api/axios";
import { uploadAnswerFile } from "../../api/questionnaires";
import Swal from "sweetalert2";

const TEAL = "#0d9488";
const FA = "Vazirmatn, Tahoma, Arial, sans-serif";

export default function PublicQuestionnaire() {
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { score_percent, student_linked, student_average }
  const [meta, setMeta] = useState({ student_name: "", father_name: "", class_name: "", student_code: "", email: "" });
  const [answers, setAnswers] = useState({});
  const [uploading, setUploading] = useState({});

  const onFile = async (qid, file) => {
    if (!file) return;
    setUploading((u) => ({ ...u, [qid]: true }));
    try {
      const r = await uploadAnswerFile(file);
      const d = r.data?.data || {};
      setAnswers((p) => ({ ...p, [qid]: { file_path: d.path, answer_text: d.name } }));
    } catch {
      Swal.fire("خطا", "بارگذاری فایل ناموفق بود.", "error");
    } finally {
      setUploading((u) => ({ ...u, [qid]: false }));
    }
  };

  useEffect(() => {
    get("/public/questionnaire/latest")
      .then((r) => setQ(r.data?.data || null))
      .catch(() => setQ(null))
      .finally(() => setLoading(false));
  }, []);

  const setAnswer = (qid, val) => setAnswers((p) => ({ ...p, [qid]: val }));

  const submit = async () => {
    if (!meta.student_name.trim()) {
      Swal.fire("نام دانش‌آموز", "لطفاً نام دانش‌آموز را وارد کنید.", "warning");
      return;
    }
    const payload = (q.questions || [])
      .map((qq) => { const a = answers[qq.id]; return a ? { question_id: qq.id, ...a } : null; })
      .filter(Boolean);
    if (payload.length === 0) { Swal.fire("پاسخ‌ها", "لطفاً حداقل به یک سؤال پاسخ دهید.", "warning"); return; }

    setSubmitting(true);
    try {
      const r = await post(`/public/questionnaire/${q.id}/respond`, { ...meta, answers: payload });
      setResult(r.data?.data || {});
    } catch (e) {
      Swal.fire("خطا", e.response?.data?.message || "ارسال ناموفق بود.", "error");
    } finally { setSubmitting(false); }
  };

  if (loading) return <Shell><div className="text-center py-16"><div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-teal-600 border-t-transparent" /></div></Shell>;
  if (!q) return <Shell><div className="text-center py-16 text-gray-500">در حال حاضر پرسشنامه‌ای برای پاسخ‌دهی وجود ندارد.</div></Shell>;

  if (result) {
    return (
      <Shell>
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-lg font-bold text-gray-800">با تشکر از شما</h2>
          <p className="text-sm text-gray-500 mt-1">پاسخ شما با موفقیت ثبت شد.</p>
          {result.score_percent != null && (
            <div className="mt-5 inline-block rounded-2xl border border-teal-100 bg-teal-50 px-6 py-3">
              <p className="text-[11px] text-teal-700">امتیاز این پرسشنامه</p>
              <p className="text-3xl font-black" style={{ color: TEAL }}>{Math.round(result.score_percent)}%</p>
            </div>
          )}
          {result.student_linked && result.student_average != null && (
            <div className="mt-3 text-sm text-gray-600">
              میانگین همه پرسشنامه‌های این دانش‌آموز: <b style={{ color: TEAL }}>{Math.round(result.student_average)}%</b>
            </div>
          )}
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-5 border-b border-gray-100 pb-4">
        <h1 className="text-lg font-black text-gray-800">{q.title}</h1>
        {q.topic && <p className="text-sm font-semibold mt-1" style={{ color: TEAL }}>موضوع: {q.topic}</p>}
        {q.description && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{q.description}</p>}
      </div>

      {/* Respondent identity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <Field label="نام دانش‌آموز *"><input value={meta.student_name} onChange={(e) => setMeta((m) => ({ ...m, student_name: e.target.value }))} className={inputCls} /></Field>
        <Field label="نام پدر"><input value={meta.father_name} onChange={(e) => setMeta((m) => ({ ...m, father_name: e.target.value }))} className={inputCls} /></Field>
        <Field label="صنف (کلاس)"><input value={meta.class_name} onChange={(e) => setMeta((m) => ({ ...m, class_name: e.target.value }))} className={inputCls} placeholder="مثلاً: اول" /></Field>
        <Field label="آی‌دی دانش‌آموز"><input value={meta.student_code} onChange={(e) => setMeta((m) => ({ ...m, student_code: e.target.value }))} className={inputCls} placeholder="WEN-ST-26-0001" dir="ltr" /></Field>
        <Field label="ایمیل"><input type="email" value={meta.email} onChange={(e) => setMeta((m) => ({ ...m, email: e.target.value }))} className={inputCls} dir="ltr" /></Field>
      </div>
      <p className="text-[11px] text-gray-400 -mt-4 mb-5">در صورت وارد کردن آی‌دی دانش‌آموز، نتیجه به پرونده همان دانش‌آموز ثبت می‌شود.</p>

      {/* Questions */}
      <div className="space-y-4">
        {(q.questions || []).map((qq, idx) => (
          <div key={qq.id} className="rounded-xl border border-gray-150 bg-gray-50/60 p-4">
            <p className="text-sm font-bold text-gray-800 mb-3">{idx + 1}. {qq.text}</p>
            {qq.type === "choice" && (
              <div className="flex flex-wrap gap-2">
                {(qq.options || []).map((o) => {
                  const active = answers[qq.id]?.option_id === o.id;
                  return <button key={o.id} type="button" onClick={() => setAnswer(qq.id, { option_id: o.id })} className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${active ? "text-white border-transparent" : "bg-white text-gray-700 border-gray-200 hover:border-teal-300"}`} style={active ? { background: TEAL } : undefined}>{o.text}</button>;
                })}
              </div>
            )}
            {qq.type === "yesno" && (
              <div className="flex gap-2">
                {[{ v: "yes", t: "بله" }, { v: "no", t: "خیر" }].map((o) => {
                  const active = answers[qq.id]?.answer_text === o.v;
                  return <button key={o.v} type="button" onClick={() => setAnswer(qq.id, { answer_text: o.v })} className={`px-5 py-1.5 rounded-lg text-sm border transition-colors ${active ? "text-white border-transparent" : "bg-white text-gray-700 border-gray-200 hover:border-teal-300"}`} style={active ? { background: TEAL } : undefined}>{o.t}</button>;
                })}
              </div>
            )}
            {qq.type === "text" && (
              <textarea rows={2} value={answers[qq.id]?.answer_text || ""} onChange={(e) => setAnswer(qq.id, { answer_text: e.target.value })} className={inputCls} placeholder="پاسخ خود را بنویسید…" />
            )}
            {qq.type === "file" && (
              <div className="flex items-center gap-3 flex-wrap">
                <label className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 bg-white text-gray-700 hover:border-teal-300 cursor-pointer">
                  انتخاب فایل / تصویر
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => onFile(qq.id, e.target.files?.[0])} />
                </label>
                {uploading[qq.id] && <span className="text-xs text-gray-400">در حال بارگذاری…</span>}
                {answers[qq.id]?.file_path && <span className="text-xs text-emerald-600">✓ {answers[qq.id].answer_text}</span>}
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={submit} disabled={submitting} className="mt-6 w-full py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50" style={{ background: TEAL }}>
        {submitting ? "در حال ارسال…" : "ارسال پاسخ‌ها"}
      </button>
    </Shell>
  );
}

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white";

function Field({ label, children }) {
  return (<div><label className="block text-[11px] font-semibold text-gray-500 mb-1">{label}</label>{children}</div>);
}

function Shell({ children }) {
  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-teal-50 to-gray-100 py-8 px-4" style={{ fontFamily: FA }}>
      <div className="max-w-2xl mx-auto">
        {/* Brand / logo */}
        <div className="flex flex-col items-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-600/25 mb-2">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 14l6.16-3.422A12.083 12.083 0 0112 21.5a12.083 12.083 0 01-6.16-10.922L12 14z" />
            </svg>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight" style={{ fontFamily: "Poppins, sans-serif", color: "#0f766e" }}>Wifaq Educational Network</h2>
          <p className="text-xs text-gray-500">پرسشنامه هفتگی والدین</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-7">{children}</div>
        <p className="text-center text-[10px] text-gray-400 mt-4" style={{ fontFamily: "Poppins, sans-serif" }}>© Wifaq Educational Network</p>
      </div>
    </div>
  );
}
