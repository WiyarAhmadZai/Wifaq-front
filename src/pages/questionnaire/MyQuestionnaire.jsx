import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { getMyQuestionnaire, respondMyQuestionnaire, uploadAnswerFile } from "../../api/questionnaires";
import { peekCache } from "../../api/axios";

const TEAL = "#0d9488";

export default function MyQuestionnaire() {
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(null);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [answers, setAnswers] = useState({});
  const [uploading, setUploading] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

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
    const __cached = peekCache("/my-questionnaire");
    if (__cached) { setQ(__cached?.data || null); setAlreadyDone(!!__cached?.already_submitted); setLoading(false); }
    getMyQuestionnaire()
      .then((r) => { setQ(r.data?.data || null); setAlreadyDone(!!r.data?.already_submitted); })
      .catch(() => setQ(null))
      .finally(() => setLoading(false));
  }, []);

  const setAnswer = (qid, val) => setAnswers((p) => ({ ...p, [qid]: val }));

  const submit = async () => {
    const payload = (q.questions || []).map((qq) => {
      const a = answers[qq.id];
      return a ? { question_id: qq.id, ...a } : null;
    }).filter(Boolean);
    if (payload.length === 0) { Swal.fire("پاسخ‌ها", "لطفاً حداقل به یک سؤال پاسخ دهید.", "warning"); return; }
    setSubmitting(true);
    try {
      await respondMyQuestionnaire(q.id, { answers: payload });
      setDone(true);
    } catch (e) {
      Swal.fire("خطا", e.response?.data?.message || "ارسال ناموفق بود.", "error");
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="py-20 text-center"><div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent" /></div>;

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto" dir="rtl" style={{ fontFamily: "Vazirmatn, Tahoma, Arial, sans-serif" }}>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-7">
        {!q ? (
          <div className="text-center py-12 text-gray-500">در حال حاضر پرسشنامه‌ای برای پاسخ‌دهی وجود ندارد.</div>
        ) : done || alreadyDone ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-lg font-bold text-gray-800">با تشکر از شما</h2>
            <p className="text-sm text-gray-500 mt-1">{alreadyDone && !done ? "شما قبلاً به این پرسشنامه پاسخ داده‌اید." : "پاسخ شما با موفقیت ثبت شد."}</p>
          </div>
        ) : (
          <>
            <div className="mb-5 border-b border-gray-100 pb-4">
              <h1 className="text-lg font-black text-gray-800">{q.title}</h1>
              {q.topic && <p className="text-sm font-semibold mt-1" style={{ color: TEAL }}>موضوع: {q.topic}</p>}
              {q.description && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{q.description}</p>}
            </div>
            <div className="space-y-4">
              {(q.questions || []).map((qq, idx) => (
                <div key={qq.id} className="rounded-xl border border-gray-150 bg-gray-50/60 p-4">
                  <p className="text-sm font-bold text-gray-800 mb-3">{idx + 1}. {qq.text}</p>
                  {qq.type === "choice" && (
                    <div className="flex flex-wrap gap-2">
                      {(qq.options || []).map((o) => {
                        const active = answers[qq.id]?.option_id === o.id;
                        return <button key={o.id} type="button" onClick={() => setAnswer(qq.id, { option_id: o.id })} className={`px-3 py-1.5 rounded-lg text-sm border ${active ? "text-white border-transparent" : "bg-white text-gray-700 border-gray-200 hover:border-teal-300"}`} style={active ? { background: TEAL } : undefined}>{o.text}</button>;
                      })}
                    </div>
                  )}
                  {qq.type === "yesno" && (
                    <div className="flex gap-2">
                      {[{ v: "yes", t: "بله" }, { v: "no", t: "خیر" }].map((o) => {
                        const active = answers[qq.id]?.answer_text === o.v;
                        return <button key={o.v} type="button" onClick={() => setAnswer(qq.id, { answer_text: o.v })} className={`px-5 py-1.5 rounded-lg text-sm border ${active ? "text-white border-transparent" : "bg-white text-gray-700 border-gray-200 hover:border-teal-300"}`} style={active ? { background: TEAL } : undefined}>{o.t}</button>;
                      })}
                    </div>
                  )}
                  {qq.type === "text" && (
                    <textarea rows={2} value={answers[qq.id]?.answer_text || ""} onChange={(e) => setAnswer(qq.id, { answer_text: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 bg-white" placeholder="پاسخ خود را بنویسید…" />
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
            <button onClick={submit} disabled={submitting} className="mt-6 w-full py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50" style={{ background: TEAL }}>{submitting ? "در حال ارسال…" : "ارسال پاسخ‌ها"}</button>
          </>
        )}
      </div>
    </div>
  );
}
