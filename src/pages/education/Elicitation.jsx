import { useState, useEffect, useCallback } from "react";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";
import Select2 from "../../components/hr/Select2";

/* Structure placeholders — exact 9 questions / 14 traits are an open question
   in the guideline (§11); stored as flexible JSON so they can be finalised later. */
const QUESTIONS = [
  "One early positive picture of the student",
  "When did the change begin?",
  "What happened in their life around that time?",
  "When is this behaviour NOT present? (exceptions)",
  "What has helped so far?",
  "What need might lie behind this behaviour?",
  "One small change in the environment we could try",
  "Each attendee's commitment — what, when, how followed up",
  "Shared understanding / summary of the session",
];
const TRAITS = [
  "Attention & focus", "Curiosity & engagement", "Independence",
  "Honesty", "Self-control", "Response to mistakes",
  "Peer relationships", "Cooperation", "Empathy",
  "Homework completion", "Punctuality", "Care of belongings",
  "Emotional regulation", "Resilience",
];
const SEVERITY = [
  { key: "low", label: "Low", tone: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  { key: "moderate", label: "Moderate", tone: "bg-amber-100 text-amber-700 border-amber-300" },
  { key: "high", label: "High", tone: "bg-red-100 text-red-700 border-red-300" },
];
const ATTENDEE_OPTS = ["Deputy of Formation", "Mentor teacher", "Subject teacher", "Parents", "Counsellor", "The student", "School principal"];
const ACTIONS = [
  { key: "continue_monitoring", label: "Continue monitoring" },
  { key: "intensify_support", label: "Intensify support" },
  { key: "return_to_normal", label: "Return to normal (clear monitoring)" },
  { key: "escalate_annual_review", label: "Escalate to Annual Review Panel" },
];
const statusTone = { planned: "bg-amber-100 text-amber-700", conducted: "bg-emerald-100 text-emerald-700" };

export default function Elicitation() {
  const [sessions, setSessions] = useState([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [monitored, setMonitored] = useState([]);
  const [planOpen, setPlanOpen] = useState(false);
  const [planForm, setPlanForm] = useState({ student_id: "", scheduled_on: "", attendees: [], goal: "" });
  const [detail, setDetail] = useState(null); // session row
  const [rec, setRec] = useState({ answers: {}, traits: {}, recommendation: "", recommendation_action: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await get("/student-elicitations");
      setSessions(r.data?.data || []);
      setCanManage(!!r.data?.can_manage);
    } catch { setSessions([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { get("/student-elicitations/monitored-students").then((r) => setMonitored(r.data?.data || [])).catch(() => setMonitored([])); }, []);

  const togglePlanAttendee = (a) => setPlanForm((p) => ({ ...p, attendees: p.attendees.includes(a) ? p.attendees.filter((x) => x !== a) : [...p.attendees, a] }));
  const submitPlan = async () => {
    if (!planForm.student_id) { Swal.fire("Pick a student", "Select a monitored student.", "warning"); return; }
    setSaving(true);
    try {
      await post("/student-elicitations", planForm);
      Swal.fire({ icon: "success", title: "Session planned", timer: 1300, showConfirmButton: false, toast: true, position: "top-end" });
      setPlanOpen(false); setPlanForm({ student_id: "", scheduled_on: "", attendees: [], goal: "" });
      load();
    } catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  const openDetail = (s) => {
    const traitMap = {};
    (s.trait_ratings || []).forEach((t) => { traitMap[t.trait] = t.severity; });
    setRec({ answers: s.answers || {}, traits: traitMap, recommendation: s.recommendation || "", recommendation_action: s.recommendation_action || "" });
    setDetail(s);
  };
  const submitRecord = async () => {
    setSaving(true);
    try {
      const trait_ratings = Object.entries(rec.traits).filter(([, v]) => v).map(([trait, severity]) => ({ trait, severity }));
      await put(`/student-elicitations/${detail.id}`, {
        answers: rec.answers, trait_ratings,
        recommendation: rec.recommendation, recommendation_action: rec.recommendation_action || null,
        conducted_on: new Date().toLocaleDateString("en-CA"),
      });
      Swal.fire({ icon: "success", title: "Session recorded", timer: 1300, showConfirmButton: false, toast: true, position: "top-end" });
      setDetail(null); load();
    } catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="bg-teal-600 px-5 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-white">Elicitation Sessions</h1>
          <p className="text-xs text-teal-100 mt-0.5">Phase 3 · a shared search for help — not a court for the student</p>
        </div>
        {canManage && (
          <button onClick={() => setPlanOpen(true)} className="px-3 py-1.5 bg-white text-teal-700 text-xs font-bold rounded-xl hover:bg-teal-50">+ Plan session</button>
        )}
      </div>

      <div className="px-4 py-5">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-400">No elicitation sessions yet.</div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <button key={s.id} onClick={() => openDetail(s)}
                className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-3 hover:shadow-md transition-shadow">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-800">{s.student}</p>
                  <p className="text-[11px] text-gray-500">
                    {s.scheduled_on ? `Planned ${s.scheduled_on}` : "No date"}
                    {s.conducted_on ? ` · Conducted ${s.conducted_on}` : ""}
                    {s.mentor ? ` · Mentor ${s.mentor}` : ""}
                  </p>
                  {s.recommendation_action && <p className="text-[10px] text-teal-700 font-semibold mt-0.5">→ {ACTIONS.find((a) => a.key === s.recommendation_action)?.label}</p>}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold capitalize flex-shrink-0 ${statusTone[s.status]}`}>{s.status}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Plan modal */}
      {planOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPlanOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 bg-teal-600"><h3 className="text-sm font-bold text-white">Plan an elicitation session</h3></div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Student (under monitoring)</label>
                <Select2 value={planForm.student_id} onChange={(v) => setPlanForm((p) => ({ ...p, student_id: v }))}
                  options={monitored.map((m) => ({ value: m.student_id, label: m.name }))} placeholder="Select a monitored student…" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Proposed date</label>
                <input type="date" value={planForm.scheduled_on} onChange={(e) => setPlanForm((p) => ({ ...p, scheduled_on: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-2">Attendees</label>
                <div className="flex flex-wrap gap-2">
                  {ATTENDEE_OPTS.map((a) => (
                    <button key={a} onClick={() => togglePlanAttendee(a)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border ${planForm.attendees.includes(a) ? "bg-teal-50 border-teal-300 text-teal-700" : "bg-white border-gray-200 text-gray-600"}`}>{a}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Session goal</label>
                <textarea value={planForm.goal} onChange={(e) => setPlanForm((p) => ({ ...p, goal: e.target.value }))} rows={2}
                  placeholder="One specific goal — e.g. understand why focus has dropped over two months."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white resize-none" />
              </div>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setPlanOpen(false)} className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={submitPlan} disabled={saving} className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl disabled:opacity-50">{saving ? "Saving…" : "Plan & notify"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail / record modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-w-2xl w-full max-h-[94vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 bg-teal-600 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">{detail.student}</h3>
                <p className="text-[11px] text-teal-100">{detail.goal || "Elicitation session"}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold capitalize ${statusTone[detail.status]}`}>{detail.status}</span>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              {detail.attendees?.length > 0 && (
                <p className="text-[11px] text-gray-500">Attendees: {detail.attendees.join(" · ")}</p>
              )}

              {/* 9 questions */}
              <div className="space-y-3">
                {QUESTIONS.map((q, i) => (
                  <div key={i}>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">{i + 1}. {q}</label>
                    <textarea value={rec.answers[i] || ""} disabled={!detail.editable}
                      onChange={(e) => setRec((r) => ({ ...r, answers: { ...r.answers, [i]: e.target.value } }))}
                      rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-400 bg-white resize-none disabled:bg-gray-50" />
                  </div>
                ))}
              </div>

              {/* 14 trait severities */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Trait severity</label>
                <div className="space-y-1.5">
                  {TRAITS.map((t) => (
                    <div key={t} className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-gray-700 flex-1 min-w-0 truncate">{t}</span>
                      <div className="flex gap-1 flex-shrink-0">
                        {SEVERITY.map((sv) => (
                          <button key={sv.key} disabled={!detail.editable}
                            onClick={() => setRec((r) => ({ ...r, traits: { ...r.traits, [t]: r.traits[t] === sv.key ? "" : sv.key } }))}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold border ${rec.traits[t] === sv.key ? sv.tone : "bg-white border-gray-200 text-gray-400"} disabled:opacity-60`}>{sv.label}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendation */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Recommendation</label>
                <textarea value={rec.recommendation} disabled={!detail.editable}
                  onChange={(e) => setRec((r) => ({ ...r, recommendation: e.target.value }))}
                  rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white resize-none disabled:bg-gray-50" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Recommended action</label>
                <select value={rec.recommendation_action} disabled={!detail.editable}
                  onChange={(e) => setRec((r) => ({ ...r, recommendation_action: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white disabled:bg-gray-50">
                  <option value="">— select —</option>
                  {ACTIONS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
                </select>
              </div>
            </div>

            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setDetail(null)} className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Close</button>
              {detail.editable && (
                <button onClick={submitRecord} disabled={saving} className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl disabled:opacity-50">{saving ? "Saving…" : "Record outcome"}</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
