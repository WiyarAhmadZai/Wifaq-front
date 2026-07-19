import { useState, useEffect, useCallback } from "react";
import { get, post, peekCache } from "../../api/axios";
import Swal from "sweetalert2";
import Select2 from "../../components/hr/Select2";

const DECISIONS = [
  { key: "continue", label: "Continue at Wifaq", tone: "bg-emerald-100 text-emerald-700" },
  { key: "continue_with_intensive_support", label: "Continue with intensified support", tone: "bg-blue-100 text-blue-700" },
  { key: "parent_conference_required", label: "Parent conference required", tone: "bg-amber-100 text-amber-700" },
  { key: "deregister", label: "De-registration", tone: "bg-red-100 text-red-700" },
];
const decLabel = (k) => DECISIONS.find((d) => d.key === k)?.label || k;
const decTone = (k) => DECISIONS.find((d) => d.key === k)?.tone || "bg-gray-100 text-gray-600";

const emptyDecision = {
  student_id: "", decision: "", reasoning: "", intensification_plan: "", family_communication_plan: "",
  effective_from: "", is_appealable: true, appeal_deadline: "", confirmed_members: [],
};

export default function AnnualReview() {
  const [mode, setMode] = useState("loading"); // loading | panels | mentor
  const [panels, setPanels] = useState([]);
  const [mentorDecisions, setMentorDecisions] = useState([]);
  const [members, setMembers] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [conveneOpen, setConveneOpen] = useState(false);
  const [convene, setConvene] = useState({ year: "", convened_on: "", member_user_ids: [], summary_doc_google_id: "" });
  const [openPanel, setOpenPanel] = useState(null); // panel detail
  const [decModal, setDecModal] = useState(null); // { amendOf? }
  const [form, setForm] = useState(emptyDecision);
  const [saving, setSaving] = useState(false);

  const loadPanels = useCallback(async () => {
    const __cached = peekCache("/annual-review/panels");
    if (__cached) { setPanels(__cached?.data || []); setMode("panels"); }
    try {
      const r = await get("/annual-review/panels");
      setPanels(r.data?.data || []);
      setMode("panels");
    } catch (e) {
      if (e.response?.status === 403) {
        const r = await get("/annual-review/decisions").catch(() => ({ data: { data: [] } }));
        setMentorDecisions(r.data?.data || []);
        setMode("mentor");
      } else { setMode("panels"); setPanels([]); }
    }
  }, []);
  useEffect(() => { loadPanels(); }, [loadPanels]);
  useEffect(() => {
    get("/annual-review/members").then((r) => setMembers(r.data?.data || [])).catch(() => {});
    get("/annual-review/candidates").then((r) => setCandidates(r.data?.data || [])).catch(() => {});
  }, []);

  const submitConvene = async () => {
    if (!convene.year || convene.member_user_ids.length === 0) { Swal.fire("Missing", "Enter the year and at least one member.", "warning"); return; }
    setSaving(true);
    try {
      await post("/annual-review/panels", { ...convene, year: Number(convene.year) });
      setConveneOpen(false); setConvene({ year: "", convened_on: "", member_user_ids: [], summary_doc_google_id: "" });
      loadPanels();
      Swal.fire({ icon: "success", title: "Panel convened", timer: 1200, showConfirmButton: false, toast: true, position: "top-end" });
    } catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  const viewPanel = async (id) => {
    try { const r = await get(`/annual-review/panels/${id}`); setOpenPanel(r.data?.data); }
    catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
  };

  const openRecord = (amendOf) => {
    if (amendOf) {
      setForm({
        student_id: amendOf.student_id, decision: amendOf.decision, reasoning: amendOf.reasoning,
        intensification_plan: amendOf.intensification_plan?.summary || "", family_communication_plan: amendOf.family_communication_plan || "",
        effective_from: amendOf.effective_from || "", is_appealable: amendOf.is_appealable, appeal_deadline: amendOf.appeal_deadline || "",
        confirmed_members: openPanel.members.map((m) => m.id),
      });
    } else {
      setForm({ ...emptyDecision, confirmed_members: [] });
    }
    setDecModal({ amendOf });
  };

  const needsPlan = form.decision && form.decision !== "continue";
  const needsFamily = ["parent_conference_required", "deregister"].includes(form.decision);

  const submitDecision = async () => {
    if (!decModal.amendOf && !form.student_id) { Swal.fire("Missing", "Pick a student.", "warning"); return; }
    if (!form.decision) { Swal.fire("Missing", "Choose a decision.", "warning"); return; }
    if ((form.reasoning || "").trim().length < 200) { Swal.fire("Reasoning too short", "The panel must articulate the reasoning — at least 200 characters.", "warning"); return; }
    if (needsPlan && !form.intensification_plan.trim()) { Swal.fire("Missing", "An intensification plan is required for this decision.", "warning"); return; }
    if (needsFamily && !form.family_communication_plan.trim()) { Swal.fire("Missing", "A family communication plan is required for this decision.", "warning"); return; }
    const allConfirmed = openPanel.members.every((m) => form.confirmed_members.includes(m.id));
    if (!allConfirmed) { Swal.fire("Sign-off required", "All panel members must confirm presence before the decision is recorded.", "warning"); return; }
    if (form.decision === "deregister") {
      const c = await Swal.fire({ title: "Record de-registration?", text: "This is the only action that removes a student. It will set the student's status to withdrawn.", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Record de-registration" });
      if (!c.isConfirmed) return;
    }

    setSaving(true);
    const payload = {
      student_id: form.student_id, decision: form.decision, reasoning: form.reasoning,
      intensification_plan: needsPlan ? { summary: form.intensification_plan } : null,
      family_communication_plan: needsFamily ? form.family_communication_plan : null,
      effective_from: form.effective_from || null, is_appealable: form.is_appealable, appeal_deadline: form.appeal_deadline || null,
      confirmed_members: form.confirmed_members,
    };
    try {
      if (decModal.amendOf) await post(`/annual-review/decisions/${decModal.amendOf.id}/amend`, payload);
      else await post(`/annual-review/panels/${openPanel.id}/decisions`, payload);
      setDecModal(null);
      viewPanel(openPanel.id);
      Swal.fire({ icon: "success", title: decModal.amendOf ? "Amendment recorded" : "Decision recorded", timer: 1400, showConfirmButton: false, toast: true, position: "top-end" });
    } catch (err) {
      const msg = err.response?.data?.message || Object.values(err.response?.data?.errors || {})[0]?.[0] || "Failed";
      Swal.fire("Error", msg, "error");
    } finally { setSaving(false); }
  };

  // ── panel detail view ──
  if (openPanel) {
    return (
      <div className="min-h-screen bg-gray-50/60">
        <div className="bg-teal-600 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => { setOpenPanel(null); loadPanels(); }} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h1 className="text-sm font-bold text-white">Annual Review Panel · {openPanel.year}</h1>
              <p className="text-[11px] text-teal-100">{openPanel.members.map((m) => m.name).filter(Boolean).join(" · ")}</p>
            </div>
          </div>
          <button onClick={() => openRecord(null)} className="px-3 py-1.5 bg-white text-teal-700 text-xs font-bold rounded-xl hover:bg-teal-50">+ Record decision</button>
        </div>

        <div className="px-4 py-5 max-w-3xl mx-auto space-y-2">
          {openPanel.decisions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-400">No decisions recorded yet.</div>
          ) : openPanel.decisions.map((d) => (
            <div key={d.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-xs font-bold text-gray-800">{d.student}{d.amends_decision_id ? <span className="ml-2 text-[9px] font-bold text-purple-600">AMENDMENT</span> : null}</p>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${decTone(d.decision)}`}>{decLabel(d.decision)}</span>
              </div>
              <p className="text-[11px] text-gray-600 whitespace-pre-wrap">{d.reasoning}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-[10px] text-gray-400">{d.reviewed_on} · {d.recorded_by}{d.appeal_deadline ? ` · appeal by ${d.appeal_deadline}` : ""}</p>
                <button onClick={() => openRecord(d)} className="text-[10px] font-bold text-teal-700 hover:underline">Amend</button>
              </div>
            </div>
          ))}
        </div>

        {decModal && <RecordModal {...{ decModal, form, setForm, openPanel, candidates, needsPlan, needsFamily, saving, submitDecision, close: () => setDecModal(null) }} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="bg-teal-600 px-5 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-white">Annual Review Panel</h1>
          <p className="text-xs text-teal-100 mt-0.5">Phase 4 · the only authority for a de-registration decision</p>
        </div>
        {mode === "panels" && <button onClick={() => setConveneOpen(true)} className="px-3 py-1.5 bg-white text-teal-700 text-xs font-bold rounded-xl hover:bg-teal-50">+ Convene panel</button>}
      </div>

      <div className="px-4 py-5 max-w-3xl mx-auto">
        {mode === "loading" ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : mode === "mentor" ? (
          mentorDecisions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-400">No panel decisions for your students.</div>
          ) : (
            <div className="space-y-2">
              {mentorDecisions.map((d) => (
                <div key={d.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-bold text-gray-800">{d.student}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${decTone(d.decision)}`}>{decLabel(d.decision)}</span>
                  </div>
                  <p className="text-[11px] text-gray-600 whitespace-pre-wrap">{d.reasoning}</p>
                  <p className="text-[10px] text-gray-400 mt-2">{d.reviewed_on}</p>
                </div>
              ))}
            </div>
          )
        ) : panels.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-400">No panels convened yet.</div>
        ) : (
          <div className="space-y-2">
            {panels.map((p) => (
              <button key={p.id} onClick={() => viewPanel(p.id)} className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-3 hover:shadow-md transition-shadow">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-800">Panel {p.year} <span className="text-gray-400 font-normal">· {p.convened_on || "no date"}</span></p>
                  <p className="text-[11px] text-gray-500 truncate">{(p.members || []).join(" · ")}</p>
                </div>
                <span className="text-[11px] font-bold text-teal-700 flex-shrink-0">{p.decisions_count} decisions</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Convene modal */}
      {conveneOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setConveneOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 bg-teal-600"><h3 className="text-sm font-bold text-white">Convene an Annual Review Panel</h3></div>
            <div className="p-5 space-y-3 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Year (Solar)</label>
                  <input type="number" value={convene.year} onChange={(e) => setConvene((c) => ({ ...c, year: e.target.value }))} placeholder="1405" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white" /></div>
                <div><label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Convened on</label>
                  <input type="date" value={convene.convened_on} onChange={(e) => setConvene((c) => ({ ...c, convened_on: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white" /></div>
              </div>
              <div><label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Panel members</label>
                <Select2 isMulti value={convene.member_user_ids} onChange={(v) => setConvene((c) => ({ ...c, member_user_ids: v || [] }))} options={members.map((m) => ({ value: m.user_id, label: m.name }))} placeholder="Principal, Deputies, mentor…" /></div>
              <div><label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Summary doc ID (optional)</label>
                <input value={convene.summary_doc_google_id} onChange={(e) => setConvene((c) => ({ ...c, summary_doc_google_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white" /></div>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setConveneOpen(false)} className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={submitConvene} disabled={saving} className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl disabled:opacity-50">{saving ? "…" : "Convene"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RecordModal({ decModal, form, setForm, openPanel, candidates, needsPlan, needsFamily, saving, submitDecision, close }) {
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleMember = (id) => setForm((f) => ({ ...f, confirmed_members: f.confirmed_members.includes(id) ? f.confirmed_members.filter((x) => x !== id) : [...f.confirmed_members, id] }));
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={close}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-w-lg w-full max-h-[94vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 bg-teal-600"><h3 className="text-sm font-bold text-white">{decModal.amendOf ? "Amend decision" : "Record panel decision"}</h3></div>
        <div className="p-5 space-y-4 overflow-y-auto">
          {decModal.amendOf ? (
            <p className="text-[11px] text-gray-500">Amending the decision for <b>{decModal.amendOf.student}</b> (the original is retained).</p>
          ) : (
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Student</label>
              <Select2 value={form.student_id} onChange={(v) => set("student_id", v)} options={candidates.map((c) => ({ value: c.student_id, label: `${c.name} — ${c.why}` }))} placeholder="Select a candidate…" />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-2">Decision</label>
            <div className="grid grid-cols-2 gap-2">
              {DECISIONS.map((d) => (
                <button key={d.key} onClick={() => set("decision", d.key)}
                  className={`px-3 py-2 rounded-xl border text-[11px] font-semibold ${form.decision === d.key ? (d.key === "deregister" ? "bg-red-600 text-white border-red-600" : "bg-teal-600 text-white border-teal-600") : "bg-white border-gray-200 text-gray-600"}`}>{d.label}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Reasoning <span className="text-gray-400 font-normal">({(form.reasoning || "").length}/200 min)</span></label>
            <textarea value={form.reasoning} onChange={(e) => set("reasoning", e.target.value)} rows={4} placeholder="The panel must articulate the reasoning (min 200 characters)." className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white resize-none" />
          </div>

          {needsPlan && (
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Intensification plan *</label>
              <textarea value={form.intensification_plan} onChange={(e) => set("intensification_plan", e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white resize-none" />
            </div>
          )}
          {needsFamily && (
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Family communication plan *</label>
              <textarea value={form.family_communication_plan} onChange={(e) => set("family_communication_plan", e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white resize-none" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Effective from</label>
              <input type="date" value={form.effective_from} onChange={(e) => set("effective_from", e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white" /></div>
            <div><label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Appeal deadline</label>
              <input type="date" value={form.appeal_deadline} onChange={(e) => set("appeal_deadline", e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white" /></div>
          </div>
          <label className="flex items-center gap-2 text-[11px] text-gray-700">
            <input type="checkbox" checked={form.is_appealable} onChange={(e) => set("is_appealable", e.target.checked)} /> This decision is appealable
          </label>

          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
            <p className="text-[11px] font-bold text-amber-800 mb-2">Member presence sign-off (all required)</p>
            <div className="space-y-1">
              {openPanel.members.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-[11px] text-gray-700">
                  <input type="checkbox" checked={form.confirmed_members.includes(m.id)} onChange={() => toggleMember(m.id)} /> {m.name}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={close} className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          <button onClick={submitDecision} disabled={saving} className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl disabled:opacity-50">{saving ? "Saving…" : "Record"}</button>
        </div>
      </div>
    </div>
  );
}
