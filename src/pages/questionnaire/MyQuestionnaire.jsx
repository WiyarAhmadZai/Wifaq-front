import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { getMyQuestionnaire, respondMyQuestionnaire, uploadAnswerFile } from "../../api/questionnaires";
import { peekCache } from "../../api/axios";
import { fmtDate } from "../../utils/formErrors";
import { useAuth } from "../../admin/context/AuthContext";

const TEAL = "#0d9488";

const AUDIENCE_LABEL = {
  families: { label: "Families", cls: "bg-violet-100 text-violet-700" },
  teachers: { label: "Teachers", cls: "bg-sky-100 text-sky-700" },
  staff:    { label: "Staff", cls: "bg-orange-100 text-orange-700" },
};

export default function MyQuestionnaire() {
  const { user } = useAuth();
  const myId = user?.id;
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [submittedIds, setSubmittedIds] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [uploading, setUploading] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [doneIds, setDoneIds] = useState([]);

  // Badges for a questionnaire row: its groups, plus "Direct"
  // when it names this account specifically.
  const badgesFor = (q) => {
    const list = Array.isArray(q.target_audiences) && q.target_audiences.length
      ? q.target_audiences
      : ["families"];
    const badges = list.map((a) => AUDIENCE_LABEL[a] || AUDIENCE_LABEL.families);
    if (myId && Array.isArray(q.target_user_ids) && q.target_user_ids.includes(myId)) {
      badges.push({ label: "Direct", cls: "bg-rose-100 text-rose-700" });
    }
    return badges;
  };

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
    if (__cached) {
      // The payload is a list (older cache entries held a single
      // questionnaire object — normalize those to a one-item list).
      const cachedList = Array.isArray(__cached?.data)
        ? __cached.data
        : (__cached?.data ? [__cached.data] : []);
      setItems(cachedList);
      setSubmittedIds(__cached?.submitted_ids || []);
      setLoading(false);
    }
    getMyQuestionnaire()
      .then((r) => {
        setItems(r.data?.data || []);
        setSubmittedIds(r.data?.submitted_ids || []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  // Several questionnaires can run at once — one per group. With a
  // single one open it straight away; with several, let the user pick.
  const open = items.length === 1 ? items[0] : items.find((q) => q.id === selectedId) || null;
  const isDone = (qid) => doneIds.includes(qid) || submittedIds.includes(qid);

  const setAnswer = (qid, val) => setAnswers((p) => ({ ...p, [qid]: val }));

  const submit = async () => {
    const payload = (open.questions || []).map((qq) => {
      const a = answers[qq.id];
      return a ? { question_id: qq.id, ...a } : null;
    }).filter(Boolean);
    if (payload.length === 0) { Swal.fire("پاسخ‌ها", "لطفاً حداقل به یک سؤال پاسخ دهید.", "warning"); return; }
    setSubmitting(true);
    try {
      await respondMyQuestionnaire(open.id, { answers: payload });
      setDoneIds((d) => [...d, open.id]);
      setSubmittedIds((s) => [...s, open.id]);
    } catch (e) {
      Swal.fire("خطا", e.response?.data?.message || "ارسال ناموفق بود.", "error");
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="py-20 text-center"><div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent" /></div>;

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto" dir="rtl" style={{ fontFamily: "Vazirmatn, Tahoma, Arial, sans-serif" }}>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-7">
        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">در حال حاضر پرسشنامه‌ای برای پاسخ‌دهی وجود ندارد.</div>
        ) : !open ? (
          <>
            <h1 className="text-lg font-black text-gray-800 mb-1">Questionnaires for you</h1>
            <p className="text-xs text-gray-400 mb-5">Your group has {items.length} open questionnaires. Choose one to answer.</p>
            <div className="space-y-3">
              {items.map((q) => {
                const done = isDone(q.id);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setSelectedId(q.id)}
                    className="w-full text-right rounded-xl border border-gray-150 bg-gray-50/60 p-4 hover:border-teal-300 hover:bg-teal-50/40 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-gray-800">{q.title}</p>
                        {q.topic && <p className="text-xs font-semibold mt-0.5" style={{ color: TEAL }}>موضوع: {q.topic}</p>}
                        {q.week_of && <p className="text-[10px] text-gray-400 mt-0.5">Week of {fmtDate(q.week_of)}</p>}
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${done ? "bg-emerald-100 text-emerald-700" : "bg-teal-100 text-teal-700"}`}>
                        {done ? "Answered" : "Open"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {badgesFor(q).map((meta) => (
                        <span key={meta.label} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${meta.cls}`}>{meta.label}</span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : isDone(open.id) ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-lg font-bold text-gray-800">با تشکر از شما</h2>
            <p className="text-sm text-gray-500 mt-1">{doneIds.includes(open.id) ? "پاسخ شما با موفقیت ثبت شد." : "شما قبلاً به این پرسشنامه پاسخ داده‌اید."}</p>
            {items.length > 1 && (
              <button onClick={() => setSelectedId(null)} className="mt-4 text-xs font-semibold text-teal-700 hover:text-teal-900">← Back to my questionnaires</button>
            )}
          </div>
        ) : (
          <>
            {items.length > 1 && (
              <button onClick={() => setSelectedId(null)} className="mb-4 text-xs text-gray-500 hover:text-gray-700">← Back to my questionnaires</button>
            )}
            <div className="mb-5 border-b border-gray-100 pb-4">
              <h1 className="text-lg font-black text-gray-800">{open.title}</h1>
              {open.topic && <p className="text-sm font-semibold mt-1" style={{ color: TEAL }}>موضوع: {open.topic}</p>}
              {open.week_of && <p className="text-[10px] text-gray-400 mt-0.5">Week of {fmtDate(open.week_of)}</p>}
              {open.description && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{open.description}</p>}
              <div className="flex flex-wrap gap-1 mt-2">
                {badgesFor(open).map((meta) => (
                  <span key={meta.label} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${meta.cls}`}>{meta.label}</span>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              {(open.questions || []).map((qq, idx) => (
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
