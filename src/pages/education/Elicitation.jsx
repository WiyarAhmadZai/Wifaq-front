import { useState, useEffect, useCallback } from "react";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";
import Select2 from "../../components/hr/Select2";

const TEAL = "#0D5C63", TEAL_LT = "#14919B", GOLD = "#C9A227", PAPER = "#F4F8F8";

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
const TRAITS = ["Attention & focus", "Curiosity & engagement", "Independence", "Honesty", "Self-control", "Response to mistakes", "Peer relationships", "Cooperation", "Empathy", "Homework completion", "Punctuality", "Care of belongings", "Emotional regulation", "Resilience"];
const SEVERITY = [{ k: "low", l: "Low", bg: "#e6f3ec", fg: "#2E7D5B" }, { k: "moderate", l: "Moderate", bg: "#fbf0db", fg: "#9a6a12" }, { k: "high", l: "High", bg: "#f7e3e1", fg: "#C0473F" }];
const ATTENDEES = ["Deputy of Formation", "Mentor teacher", "Subject teacher", "Parents", "Counsellor", "The student", "School principal"];
const ACTIONS = [{ k: "continue_monitoring", l: "Continue monitoring" }, { k: "intensify_support", l: "Intensify support" }, { k: "return_to_normal", l: "Return to normal (clear)" }, { k: "escalate_annual_review", l: "Escalate to Annual Review" }];
const aLabel = (k) => ACTIONS.find((a) => a.k === k)?.l || k;

const TONE = { planned: { bg: "#fbf0db", fg: "#9a6a12", label: "Planned" }, conducted: { bg: "#e6f3ec", fg: "#2E7D5B", label: "Conducted" } };
const Pill = ({ s }) => { const t = TONE[s] || { bg: "#eef3f3", fg: "#5d7273", label: s }; return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: t.bg, color: t.fg }}>{t.label}</span>; };
const initials = (n) => (n || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const Spinner = () => <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: "#cfe4e4", borderTopColor: TEAL }} /></div>;
const L = ({ children }) => <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">{children}</label>;

export default function Elicitation() {
  const [list, setList] = useState([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [monitored, setMonitored] = useState([]);
  const [planOpen, setPlanOpen] = useState(false);
  const [planForm, setPlanForm] = useState({ student_id: "", scheduled_on: "", attendees: [], goal: "" });
  const [selected, setSelected] = useState(null);
  const [rec, setRec] = useState({ answers: {}, traits: {}, recommendation: "", recommendation_action: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await get("/student-elicitations"); setList(r.data?.data || []); setCanManage(!!r.data?.can_manage); }
    catch { setList([]); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { get("/student-elicitations/monitored-students").then((r) => setMonitored(r.data?.data || [])).catch(() => {}); }, []);

  const pick = async (id) => {
    try {
      const r = await get(`/student-elicitations/${id}`); const s = r.data?.data;
      const tmap = {}; (s.trait_ratings || []).forEach((t) => { tmap[t.trait] = t.severity; });
      setRec({ answers: s.answers || {}, traits: tmap, recommendation: s.recommendation || "", recommendation_action: s.recommendation_action || "" });
      setSelected(s);
    } catch (e) { Swal.fire("Error", e.response?.data?.message || "Failed", "error"); }
  };

  const togglePlanAtt = (a) => setPlanForm((p) => ({ ...p, attendees: p.attendees.includes(a) ? p.attendees.filter((x) => x !== a) : [...p.attendees, a] }));
  const submitPlan = async () => {
    if (!planForm.student_id) { Swal.fire("Pick a student", "Select a monitored student.", "warning"); return; }
    setSaving(true);
    try { await post("/student-elicitations", planForm); setPlanOpen(false); setPlanForm({ student_id: "", scheduled_on: "", attendees: [], goal: "" }); load(); Swal.fire({ icon: "success", title: "Session planned", timer: 1200, showConfirmButton: false, toast: true, position: "top-end" }); }
    catch (e) { Swal.fire("Error", e.response?.data?.message || "Failed", "error"); } finally { setSaving(false); }
  };

  const submitRecord = async () => {
    setSaving(true);
    try {
      const trait_ratings = Object.entries(rec.traits).filter(([, v]) => v).map(([trait, severity]) => ({ trait, severity }));
      await put(`/student-elicitations/${selected.id}`, { answers: rec.answers, trait_ratings, recommendation: rec.recommendation, recommendation_action: rec.recommendation_action || null, conducted_on: new Date().toLocaleDateString("en-CA") });
      Swal.fire({ icon: "success", title: "Recorded", timer: 1200, showConfirmButton: false, toast: true, position: "top-end" });
      load(); pick(selected.id);
    } catch (e) { Swal.fire("Error", e.response?.data?.message || "Failed", "error"); } finally { setSaving(false); }
  };

  const ro = selected && !selected.editable;

  return (
    <div className="min-h-screen" style={{ background: PAPER }}>
      <div className="px-5 py-4 flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${TEAL}, #063033)` }}>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: GOLD }}>Education & Formation · Layer 3</p>
          <h1 className="text-base font-black text-white mt-0.5">Elicitation Sessions</h1>
        </div>
        {canManage && <button onClick={() => setPlanOpen(true)} className="px-4 py-2 rounded-xl text-xs font-bold" style={{ background: "#fff", color: TEAL }}>＋ Plan session</button>}
      </div>

      <div className="max-w-6xl mx-auto lg:grid lg:grid-cols-[320px_1fr]">
        {/* LEFT */}
        <aside className={`border-r ${selected ? "hidden lg:block" : ""}`} style={{ borderColor: "#dbe8e8", background: "#fff" }}>
          <div className="px-4 py-2.5 border-b text-[10px] font-bold uppercase tracking-wider text-gray-400" style={{ borderColor: "#eef4f4" }}>{list.length} session{list.length === 1 ? "" : "s"}</div>
          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 180px)" }}>
            {loading ? <Spinner /> : list.length === 0 ? <p className="p-6 text-center text-xs text-gray-400">No sessions yet.</p> : list.map((s) => {
              const on = selected?.id === s.id;
              return (
                <button key={s.id} onClick={() => pick(s.id)} className="w-full flex items-center gap-3 px-3 py-2.5 text-left border-l-2" style={on ? { background: "#E8F6F6", borderColor: TEAL } : { background: "transparent", borderColor: "transparent" }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-black text-white flex-shrink-0" style={{ background: `linear-gradient(140deg, ${TEAL_LT}, ${TEAL})` }}>{initials(s.student)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-800 truncate">{s.student}</p>
                    <p className="text-[10px] text-gray-400">{s.conducted_on || s.scheduled_on || "no date"}{s.recommendation_action ? ` · ${aLabel(s.recommendation_action)}` : ""}</p>
                  </div>
                  <Pill s={s.status} />
                </button>
              );
            })}
          </div>
        </aside>

        {/* RIGHT */}
        <main className={`${selected ? "" : "hidden lg:block"}`}>
          {!selected ? (
            <div className="flex flex-col items-center justify-center text-center p-10" style={{ minHeight: "60vh" }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: "#E8F6F6", color: TEAL }}>🗣️</div>
              <p className="text-sm font-bold text-gray-600">Select a session</p>
              <p className="text-xs text-gray-400 mt-1">A shared search for help — not a court for the student.</p>
            </div>
          ) : (
            <div>
              <div className="px-5 py-4 flex items-center gap-3 border-b bg-white" style={{ borderColor: "#eef4f4" }}>
                <button onClick={() => setSelected(null)} className="lg:hidden p-2 rounded-lg" style={{ background: "#E8F6F6", color: TEAL }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black text-white" style={{ background: `linear-gradient(140deg, ${TEAL_LT}, ${TEAL})` }}>{initials(selected.student)}</div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-black text-gray-800 truncate">{selected.student}</h2>
                  <p className="text-[11px] text-gray-400">{selected.scheduled_on ? `Planned ${selected.scheduled_on}` : "No date"}{selected.conducted_on ? ` · Conducted ${selected.conducted_on}` : ""}{selected.convener ? ` · by ${selected.convener}` : ""}</p>
                </div>
                <Pill s={selected.status} />
              </div>

              <div className="p-5 space-y-5">
                {selected.goal && (
                  <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg,#E8F6F6,#fff)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Session goal</p>
                    <p className="text-xs text-gray-700">{selected.goal}</p>
                  </div>
                )}
                {selected.attendees?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.attendees.map((a) => <span key={a} className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: "#fff", border: "1px solid #dbe8e8", color: "#5d7273" }}>{a}</span>)}
                  </div>
                )}

                {/* 9 questions */}
                <div className="space-y-3">
                  <L>The session — 9 questions</L>
                  {QUESTIONS.map((q, i) => (
                    <div key={i}>
                      <p className="text-[11px] font-semibold text-gray-600 mb-1">{i + 1}. {q}</p>
                      <textarea value={rec.answers[i] || ""} disabled={ro} onChange={(e) => setRec((r) => ({ ...r, answers: { ...r.answers, [i]: e.target.value } }))} rows={2}
                        className="w-full px-3 py-2 border rounded-lg text-xs bg-white resize-none focus:outline-none disabled:bg-gray-50" style={{ borderColor: "#dbe8e8" }} />
                    </div>
                  ))}
                </div>

                {/* traits */}
                <div>
                  <L>Trait severity</L>
                  <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "#dbe8e8" }}>
                    {TRAITS.map((t, i) => (
                      <div key={t} className={`flex items-center justify-between gap-2 px-3 py-2 ${i ? "border-t" : ""}`} style={{ borderColor: "#eef4f4", background: i % 2 ? "#fafcfc" : "#fff" }}>
                        <span className="text-[11px] text-gray-700 flex-1 min-w-0 truncate">{t}</span>
                        <div className="flex gap-1 flex-shrink-0">
                          {SEVERITY.map((sv) => {
                            const on = rec.traits[t] === sv.k;
                            return <button key={sv.k} disabled={ro} onClick={() => setRec((r) => ({ ...r, traits: { ...r.traits, [t]: on ? "" : sv.k } }))}
                              className="px-2 py-1 rounded-md text-[10px] font-bold border disabled:opacity-60" style={on ? { background: sv.bg, color: sv.fg, borderColor: sv.fg } : { background: "#fff", color: "#9ca3af", borderColor: "#e5e7eb" }}>{sv.l}</button>;
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* recommendation */}
                <div>
                  <L>Recommendation</L>
                  <textarea value={rec.recommendation} disabled={ro} onChange={(e) => setRec((r) => ({ ...r, recommendation: e.target.value }))} rows={2} className="w-full px-3 py-2 border rounded-xl text-xs bg-white resize-none focus:outline-none disabled:bg-gray-50" style={{ borderColor: "#dbe8e8" }} />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ACTIONS.map((a) => (
                      <button key={a.k} disabled={ro} onClick={() => setRec((r) => ({ ...r, recommendation_action: r.recommendation_action === a.k ? "" : a.k }))}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold border disabled:opacity-60" style={rec.recommendation_action === a.k ? (a.k === "escalate_annual_review" ? { background: "#f7e3e1", color: "#C0473F", borderColor: "#C0473F" } : { background: TEAL, color: "#fff", borderColor: TEAL }) : { background: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}>{a.l}</button>
                    ))}
                  </div>
                </div>

                {selected.editable && (
                  <div className="flex justify-end">
                    <button onClick={submitRecord} disabled={saving} className="px-5 py-2 text-xs font-bold text-white rounded-xl disabled:opacity-50" style={{ background: `linear-gradient(120deg, ${TEAL_LT}, ${TEAL})` }}>{saving ? "Saving…" : "Record outcome"}</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Plan modal */}
      {planOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(5,37,40,.45)", backdropFilter: "blur(3px)" }} onClick={() => setPlanOpen(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-md w-full max-h-[94vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4" style={{ background: `linear-gradient(135deg, ${TEAL}, #063033)` }}><h3 className="text-sm font-black text-white">Plan an elicitation session</h3></div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div><L>Student (under monitoring)</L><Select2 value={planForm.student_id} onChange={(v) => setPlanForm((p) => ({ ...p, student_id: v }))} options={monitored.map((m) => ({ value: m.student_id, label: m.name }))} placeholder="Select a monitored student…" /></div>
              <div><L>Proposed date</L><input type="date" value={planForm.scheduled_on} onChange={(e) => setPlanForm((p) => ({ ...p, scheduled_on: e.target.value }))} className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:outline-none" style={{ borderColor: "#dbe8e8" }} /></div>
              <div><L>Attendees</L><div className="flex flex-wrap gap-2">{ATTENDEES.map((a) => (
                <button key={a} onClick={() => togglePlanAtt(a)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border" style={planForm.attendees.includes(a) ? { background: "#E8F6F6", color: TEAL, borderColor: TEAL_LT } : { background: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}>{a}</button>
              ))}</div></div>
              <div><L>Session goal</L><textarea value={planForm.goal} onChange={(e) => setPlanForm((p) => ({ ...p, goal: e.target.value }))} rows={2} placeholder="One specific goal." className="w-full px-3 py-2 border rounded-xl text-xs bg-white resize-none focus:outline-none" style={{ borderColor: "#dbe8e8" }} /></div>
            </div>
            <div className="px-5 py-3 border-t flex justify-end gap-2" style={{ background: "#fafcfc", borderColor: "#eef4f4" }}>
              <button onClick={() => setPlanOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl">Cancel</button>
              <button onClick={submitPlan} disabled={saving} className="px-5 py-2 text-xs font-bold text-white rounded-xl disabled:opacity-50" style={{ background: `linear-gradient(120deg, ${TEAL_LT}, ${TEAL})` }}>{saving ? "Saving…" : "Plan & notify"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
