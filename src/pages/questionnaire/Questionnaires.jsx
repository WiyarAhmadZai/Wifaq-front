import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { listQuestionnaires, deleteQuestionnaire, publishQuestionnaire, closeQuestionnaire } from "../../api/questionnaires";
import { peekCache } from "../../api/axios";
import { useAuth } from "../../admin/context/AuthContext";
import { fmtDate } from "../../utils/formErrors";

const STATUS = {
  draft:     { label: "Draft", cls: "bg-gray-100 text-gray-600" },
  published: { label: "Published", cls: "bg-emerald-100 text-emerald-700" },
  closed:    { label: "Closed", cls: "bg-amber-100 text-amber-700" },
};

export default function Questionnaires() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const can = (a) => hasPermission(`questionnaires.${a}`) || hasPermission("questionnaires.manage");

  const load = async () => {
    setLoading(true);
    const __cached = peekCache("/questionnaires", { per_page: 1000 });
    if (__cached) { setItems(__cached?.data || []); setLoading(false); }
    try {
      const r = await listQuestionnaires({ per_page: 1000 });
      setItems(r.data?.data || []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const doPublish = async (id) => { await publishQuestionnaire(id); load(); };
  const doClose = async (id) => { await closeQuestionnaire(id); load(); };
  const doDelete = async (id) => {
    const r = await Swal.fire({ title: "Delete questionnaire?", text: "All its questions and responses are removed.", icon: "warning", showCancelButton: true, confirmButtonColor: "#dc2626", confirmButtonText: "Delete" });
    if (!r.isConfirmed) return;
    try { await deleteQuestionnaire(id); load(); Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false }); }
    catch (e) { Swal.fire("Error", e.response?.data?.message || "Failed", "error"); }
  };

  return (
    <div className="px-4 py-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Weekly Questionnaires</h1>
          <p className="text-xs text-gray-400 mt-0.5">Parent evaluations of students — one per week/topic.</p>
        </div>
        {can("create") && (
          <button onClick={() => navigate("/questionnaires/create")}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Questionnaire
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          <p className="text-sm text-gray-400">No questionnaires yet. Create your first weekly questionnaire.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left px-4 py-3 font-bold">Title</th>
                <th className="text-left px-4 py-3 font-bold">Topic</th>
                <th className="text-left px-4 py-3 font-bold">Week</th>
                <th className="text-center px-4 py-3 font-bold">Questions</th>
                <th className="text-center px-4 py-3 font-bold">Responses</th>
                <th className="text-center px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((q) => {
                const st = STATUS[q.status] || STATUS.draft;
                return (
                  <tr key={q.id} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3 font-semibold text-gray-800">{q.title}</td>
                    <td className="px-4 py-3 text-gray-600">{q.topic || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{q.week_of ? fmtDate(q.week_of) : "—"}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{q.questions_count ?? 0}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{q.responses_count ?? 0}</td>
                    <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${st.cls}`}>{st.label}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn title="View" tone="gray" onClick={() => navigate(`/questionnaires/${q.id}`)}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        <IconBtn title="Results" tone="teal" onClick={() => navigate(`/questionnaires/${q.id}/responses`)}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m0 0v-4a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        {can("update") && q.status === "draft" && (
                          <IconBtn title="Edit" tone="blue" onClick={() => navigate(`/questionnaires/edit/${q.id}`)}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        )}
                        {can("update") && q.status !== "published" && (
                          <IconBtn title="Publish" tone="emerald" onClick={() => doPublish(q.id)}
                            d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        )}
                        {can("update") && q.status === "published" && (
                          <IconBtn title="Close" tone="amber" onClick={() => doClose(q.id)}
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        )}
                        {can("delete") && (
                          <IconBtn title="Delete" tone="red" onClick={() => doDelete(q.id)}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M4 7h16M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const TONES = {
  gray: "text-gray-500 hover:bg-gray-100",
  teal: "text-teal-600 hover:bg-teal-50",
  blue: "text-blue-600 hover:bg-blue-50",
  emerald: "text-emerald-600 hover:bg-emerald-50",
  amber: "text-amber-600 hover:bg-amber-50",
  red: "text-red-500 hover:bg-red-50",
};

function IconBtn({ title, tone = "gray", onClick, d }) {
  return (
    <button onClick={onClick} title={title} className={`p-1.5 rounded-lg ${TONES[tone] || TONES.gray}`}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {d.split(" M").map((seg, i) => <path key={i} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={i === 0 ? seg : "M" + seg} />)}
      </svg>
    </button>
  );
}
