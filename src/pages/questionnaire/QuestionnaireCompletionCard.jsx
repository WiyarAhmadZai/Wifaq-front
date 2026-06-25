import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCompletion } from "../../api/questionnaires";

// Dashboard card showing how many families have completed the live questionnaire.
// Self-contained: fetches its own data and renders nothing if there's no live
// questionnaire or the user lacks access.
export default function QuestionnaireCompletionCard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    getCompletion().then((r) => setData(r.data?.data || null)).catch(() => setData(null));
  }, []);

  if (!data || !data.questionnaire) return null;

  const pct = Math.max(0, Math.min(100, Number(data.completion_percent) || 0));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-5 p-5 cursor-pointer hover:border-teal-200"
      onClick={() => navigate(`/questionnaires/${data.questionnaire.id}/responses`)}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600">Weekly Questionnaire</p>
          <p className="text-sm font-bold text-gray-800 truncate">{data.questionnaire.title}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-black text-teal-700">{pct}%</p>
          <p className="text-[10px] text-gray-400">completed</p>
        </div>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between mt-2 text-[11px] text-gray-500">
        <span>{data.responded_families} of {data.total_families} families</span>
        {data.average_score != null && <span>Avg score: <b className="text-teal-700">{Math.round(data.average_score)}%</b></span>}
      </div>
    </div>
  );
}
