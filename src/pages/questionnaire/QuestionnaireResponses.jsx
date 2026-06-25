import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getResponses, getQuestionnaire } from "../../api/questionnaires";
import { API_BASE_URL } from "../../api/axios";
import { fmtDate } from "../../utils/formErrors";

const fileUrl = (p) => (p?.startsWith("http") ? p : `${API_BASE_URL}/storage/${p}`);

const pct = (v) => (v == null ? "—" : `${Number(v).toFixed(0)}%`);

export default function QuestionnaireResponses() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [responses, setResponses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    getQuestionnaire(id).then((r) => setTitle(r.data?.data?.title || "")).catch(() => {});
    getResponses(id).then((r) => { setResponses(r.data?.data || []); setStats(r.data?.stats || null); })
      .catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const respondentName = (r) => r.family?.father_name || r.student_name || (r.student ? `${r.student.first_name} ${r.student.last_name}` : "—");

  return (
    <div className="px-4 py-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Results</h1>
          <p className="text-xs text-gray-400">{title}</p>
        </div>
        <button onClick={() => navigate("/questionnaires")} className="text-xs text-gray-500 hover:text-gray-700">← Back</button>
      </div>

      {loading ? (
        <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent" /></div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
            <Stat label="Responses" value={stats?.total_responses ?? 0} />
            <Stat label="Average score" value={pct(stats?.average_score)} accent />
          </div>

          {/* Per-question breakdown */}
          {stats?.per_question?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
              <h3 className="text-sm font-bold text-gray-800 mb-3">Per-question breakdown</h3>
              <div className="space-y-3">
                {stats.per_question.map((qq, i) => (
                  <div key={qq.id} className="border-b border-gray-50 pb-3 last:border-0">
                    <div className="flex justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-700">{i + 1}. {qq.text}</p>
                      {qq.type !== "text" && <span className="text-xs font-bold text-teal-700 whitespace-nowrap">avg {pct(qq.avg_score)}</span>}
                    </div>
                    {qq.type === "choice" && (
                      <div className="mt-1.5 space-y-1">
                        {qq.options.map((o, oi) => (
                          <div key={oi} className="flex items-center gap-2 text-[11px]">
                            <span className="w-28 text-gray-500 truncate">{o.text}</span>
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-teal-500" style={{ width: `${stats.total_responses ? (o.count / stats.total_responses) * 100 : 0}%` }} />
                            </div>
                            <span className="w-8 text-right text-gray-600">{o.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {qq.type === "yesno" && (
                      <p className="text-[11px] text-gray-500 mt-1">بله: <b className="text-emerald-600">{qq.yes}</b> · خیر: <b className="text-red-500">{qq.no}</b></p>
                    )}
                    {qq.type === "text" && <p className="text-[10px] text-gray-400 mt-1">Free-text — see individual responses.</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Individual responses */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="text-left px-4 py-3 font-bold">Respondent</th>
                  <th className="text-left px-4 py-3 font-bold">Source</th>
                  <th className="text-center px-4 py-3 font-bold">Score</th>
                  <th className="text-left px-4 py-3 font-bold">Submitted</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {responses.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-xs">No responses yet.</td></tr>}
                {responses.map((r) => (
                  <>
                    <tr key={r.id} className="hover:bg-gray-50/70 cursor-pointer" onClick={() => setOpen(open === r.id ? null : r.id)}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-800">{respondentName(r)}</div>
                        {r.student_name && <div className="text-[10px] text-gray-400">student: {r.student_name}{r.father_name ? ` · s/o ${r.father_name}` : ""}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{r.source}</td>
                      <td className="px-4 py-3 text-center font-bold text-teal-700">{pct(r.score_percent)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{r.submitted_at ? fmtDate(r.submitted_at) : "—"}</td>
                      <td className="px-4 py-3 text-right text-xs text-teal-600">{open === r.id ? "Hide" : "View"}</td>
                    </tr>
                    {open === r.id && (
                      <tr key={`${r.id}-d`}><td colSpan={5} className="px-4 py-3 bg-gray-50/60">
                        <div className="space-y-2">
                          {(r.answers || []).map((a) => (
                            <div key={a.id} className="text-xs">
                              <span className="text-gray-500">{a.question?.text}: </span>
                              {a.file_path ? (
                                <a href={fileUrl(a.file_path)} target="_blank" rel="noopener" className="font-semibold text-teal-600 underline">
                                  {a.answer_text || "View file"}
                                </a>
                              ) : (
                                <span className="font-semibold text-gray-800">{a.option?.text || a.answer_text || "—"}</span>
                              )}
                              {a.score != null && <span className="text-[10px] text-teal-600 ml-1">({pct(a.score)})</span>}
                            </div>
                          ))}
                        </div>
                      </td></tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "bg-teal-600 border-teal-600" : "bg-white border-teal-100"}`}>
      <p className={`text-[10px] font-medium ${accent ? "text-teal-100" : "text-gray-500"}`}>{label}</p>
      <p className={`text-2xl font-bold ${accent ? "text-white" : "text-gray-800"}`}>{value}</p>
    </div>
  );
}
