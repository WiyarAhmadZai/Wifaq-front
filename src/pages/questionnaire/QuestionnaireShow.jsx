import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getQuestionnaire } from "../../api/questionnaires";
import { fmtDate } from "../../utils/formErrors";

const TYPE_LABEL = { choice: "Multiple choice", yesno: "Yes / No", text: "Short answer", file: "File / image upload" };

export default function QuestionnaireShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [q, setQ] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getQuestionnaire(id).then((r) => setQ(r.data?.data || null)).catch(() => setQ(null)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="py-20 text-center"><div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent" /></div>;
  if (!q) return <div className="px-4 py-10 text-center text-gray-500">Questionnaire not found.</div>;

  return (
    <div className="px-4 py-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate("/questionnaires")} className="text-xs text-gray-500 hover:text-gray-700">← Back</button>
        <div className="flex gap-2">
          <button onClick={() => navigate(`/questionnaires/edit/${q.id}`)} className="px-3 py-1.5 bg-white border border-blue-200 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-50">Edit</button>
          <button onClick={() => navigate(`/questionnaires/${q.id}/responses`)} className="px-3 py-1.5 bg-teal-600 text-white text-xs font-bold rounded-lg hover:bg-teal-700">Results</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4" dir="auto">
        <h1 className="text-lg font-black text-gray-800">{q.title}</h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
          {q.topic && <span>Topic: <b className="text-gray-700">{q.topic}</b></span>}
          {q.week_of && <span>Week: {fmtDate(q.week_of)}</span>}
          <span>Status: <b className="text-gray-700 capitalize">{q.status}</b></span>
          <span>{q.is_public ? "Public link: on" : "Public link: off"}</span>
        </div>
        {q.description && <p className="text-sm text-gray-600 mt-3 leading-relaxed">{q.description}</p>}
      </div>

      <div className="space-y-3">
        {(q.questions || []).map((qq, i) => (
          <div key={qq.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4" dir="auto">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold text-gray-800">{i + 1}. {qq.text}</p>
              <span className="text-[10px] font-semibold text-gray-400 whitespace-nowrap">{TYPE_LABEL[qq.type] || qq.type}</span>
            </div>
            {qq.type === "choice" && (
              <div className="mt-2 flex flex-wrap gap-2">
                {(qq.options || []).map((o) => (
                  <span key={o.id} className="px-2.5 py-1 rounded-lg text-xs bg-gray-50 border border-gray-150 text-gray-700">
                    {o.text} <span className="text-teal-600 font-semibold">({Math.round(o.score)}%)</span>
                  </span>
                ))}
              </div>
            )}
            {qq.type === "yesno" && <p className="mt-1.5 text-[11px] text-gray-400">بله (100%) / خیر (0%)</p>}
            {qq.type === "text" && <p className="mt-1.5 text-[11px] text-gray-400">Free-text answer (not scored)</p>}
            {qq.type === "file" && <p className="mt-1.5 text-[11px] text-gray-400">File / image upload (not scored)</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
