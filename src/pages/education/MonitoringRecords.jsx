import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get, post, put, del, peekCache } from "../../api/axios";
import Swal from "sweetalert2";

const TEAL = "#0D5C63", TEAL_LT = "#14919B", GOLD = "#C9A227", PAPER = "#F4F8F8";

// Same fields as the follow-up form on the Monitoring page — one shared flow.
const ACTIONS = ["Conversation with the student", "Contact with family", "Meeting with the mentor teacher", "Referral to counsellor", "Change in classroom environment"];
const CHANGE = [{ key: "better", label: "↑ Better" }, { key: "same", label: "= Same" }, { key: "worse", label: "↓ Worse" }, { key: "unclear", label: "Not clear" }];
const CHANGE_TONE = { better: { bg: "#e6f3ec", fg: "#2E7D5B" }, same: { bg: "#eef3f3", fg: "#5d7273" }, worse: { bg: "#fde9e9", fg: "#b4322c" }, unclear: { bg: "#fbf0db", fg: "#9a6a12" } };
const TONE = { assigned: { bg: "#fbf0db", fg: "#9a6a12", label: "Assigned" }, completed: { bg: "#e6f3ec", fg: "#2E7D5B", label: "Completed" } };

const initials = (n) => (n || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const Spinner = () => <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: "#cfe4e4", borderTopColor: TEAL }} /></div>;
const Pill = ({ s }) => { const t = TONE[s] || { bg: "#eef3f3", fg: "#5d7273", label: s }; return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: t.bg, color: t.fg }}>{t.label}</span>; };

export default function MonitoringRecords() {
  const { monitoringId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [records, setRecords] = useState([]);
  const [canRecord, setCanRecord] = useState(false);
  const [busy, setBusy] = useState(false);

  // editing: null = closed, {} = new record, {id,...} = edit existing
  const [editing, setEditing] = useState(null);
  const blank = { pattern: "", change_vs_last_month: "", actions_taken: [], actions_impact: "", next_month_plan: "" };
  const [form, setForm] = useState(blank);

  const load = useCallback(async () => {
    setLoading(true);
    const __cached = peekCache(`/student-monitorings/${monitoringId}/records`);
    if (__cached) { setStudent(__cached?.student || null); setRecords(__cached?.data || []); setCanRecord(!!__cached?.can_record); setLoading(false); }
    try {
      const r = await get(`/student-monitorings/${monitoringId}/records`);
      setStudent(r.data?.student || null);
      setRecords(r.data?.data || []);
      setCanRecord(!!r.data?.can_record);
    } catch (e) {
      Swal.fire("Unavailable", e.response?.data?.message || "Could not load records.", "error");
      setRecords([]);
    } finally { setLoading(false); }
  }, [monitoringId]);
  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(blank); setEditing({}); };
  const openEdit = (rec) => { setForm({ pattern: rec.pattern || "", change_vs_last_month: rec.change_vs_last_month || "", actions_taken: rec.actions_taken || [], actions_impact: rec.actions_impact || "", next_month_plan: rec.next_month_plan || "" }); setEditing(rec); };
  const toggleAction = (a) => setForm((p) => ({ ...p, actions_taken: p.actions_taken.includes(a) ? p.actions_taken.filter((x) => x !== a) : [...p.actions_taken, a] }));

  const submit = async () => {
    if (!form.pattern.trim()) { Swal.fire("Missing", "Describe the pattern observed.", "warning"); return; }
    if (!form.change_vs_last_month) { Swal.fire("Missing", "Pick the change vs. last record.", "warning"); return; }
    setBusy(true);
    try {
      if (editing?.id) await put(`/student-monitorings/followups/${editing.id}`, form);
      else await post(`/student-monitorings/${monitoringId}/records`, form);
      Swal.fire({ icon: "success", title: editing?.id ? "Updated" : "Record added", timer: 1100, showConfirmButton: false, toast: true, position: "top-end" });
      setEditing(null); setForm(blank); load();
    } catch (e) { Swal.fire("Error", e.response?.data?.message || "Failed to save.", "error"); }
    finally { setBusy(false); }
  };

  const remove = async (rec) => {
    const r = await Swal.fire({ title: "Remove this record?", icon: "warning", showCancelButton: true, confirmButtonColor: "#b4322c", confirmButtonText: "Remove" });
    if (!r.isConfirmed) return;
    try { await del(`/student-monitorings/records/${rec.id}`); load(); }
    catch (e) { Swal.fire("Error", e.response?.data?.message || "Failed", "error"); }
  };

  return (
    <div className="min-h-screen" style={{ background: PAPER }}>
      {/* Header */}
      <div className="px-5 py-4" style={{ background: `linear-gradient(135deg, ${TEAL}, #063033)` }}>
        <button onClick={() => navigate("/education/monitoring")} className="flex items-center gap-1.5 text-[11px] font-bold mb-2" style={{ color: "#9ec3c3" }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to monitoring
        </button>
        <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: GOLD }}>Education & Formation · Monitoring records</p>
        {student ? (
          <div className="flex items-center gap-3 mt-2">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0" style={{ background: `linear-gradient(140deg, ${TEAL_LT}, ${TEAL})` }}>{initials(student.name)}</div>
            <div className="min-w-0">
              <h1 className="text-base font-black text-white truncate">{student.name}</h1>
              <p className="text-[11px]" style={{ color: "#9ec3c3" }}>{student.class || "—"}{student.flagged_on ? ` · flagged ${student.flagged_on}` : ""}{student.flagged_by ? ` by ${student.flagged_by}` : ""}</p>
            </div>
          </div>
        ) : <h1 className="text-base font-black text-white mt-1">Monitoring records</h1>}
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5">
        {student?.reason && (
          <div className="rounded-2xl p-4 mb-4" style={{ background: "linear-gradient(135deg,#fbf7ec,#fff)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Why flagged</p>
            <p className="text-xs text-gray-700">{student.reason}</p>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{records.length} record{records.length === 1 ? "" : "s"} during monitoring</p>
          {canRecord && <button onClick={openNew} className="px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: `linear-gradient(120deg, ${TEAL_LT}, ${TEAL})` }}>+ Add record</button>}
        </div>

        {loading ? <Spinner /> : records.length === 0 ? (
          <div className="bg-white rounded-2xl border text-center py-14 px-6" style={{ borderColor: "#dbe8e8" }}>
            <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3" style={{ background: "#E8F6F6", color: TEAL }}>📋</div>
            <p className="text-sm font-bold text-gray-600">No records yet</p>
            <p className="text-xs text-gray-400 mt-1">{canRecord ? "Add the first record for this student." : "Nothing has been logged for this student yet."}</p>
          </div>
        ) : (
          <div className="relative pl-5" style={{ borderLeft: "2px solid #e7f1f1", marginLeft: "4px" }}>
            {records.map((r) => {
              const ct = CHANGE_TONE[r.change_vs_last_month];
              return (
                <div key={r.id} className="relative pb-5 last:pb-0">
                  <span className="absolute -left-[27px] top-2 w-3 h-3 rounded-full border-2 border-white" style={{ background: r.status === "completed" ? "#2E7D5B" : "#C9A227" }} />
                  <div className="bg-white rounded-2xl border p-4" style={{ borderColor: "#e7f1f1" }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-800">{r.recorded_on || r.period}{r.mentor ? ` · ${r.mentor}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Pill s={r.status} />
                        {r.editable && (
                          <>
                            <button onClick={() => openEdit(r)} title="Edit" className="p-1.5 rounded-lg" style={{ background: "#E8F6F6", color: TEAL }}>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => remove(r)} title="Remove" className="p-1.5 rounded-lg" style={{ background: "#fdeceb", color: "#b4322c" }}>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {r.pattern && <p className="text-xs text-gray-700 mt-2 whitespace-pre-wrap">{r.pattern}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {r.change_vs_last_month && <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: ct?.bg, color: ct?.fg }}>{r.change_vs_last_month}</span>}
                      {(r.actions_taken || []).map((a) => <span key={a} className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: "#E8F6F6", color: TEAL }}>{a}</span>)}
                    </div>
                    {r.actions_impact && <p className="text-[11px] text-gray-500 mt-2"><b className="text-gray-600">Impact:</b> {r.actions_impact}</p>}
                    {r.next_month_plan && <p className="text-[11px] text-gray-500 mt-1"><b className="text-gray-600">Next:</b> {r.next_month_plan}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Record form — same fields as the Monitoring follow-up form */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(5,37,40,.45)", backdropFilter: "blur(3px)" }} onClick={() => setEditing(null)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-lg w-full max-h-[94vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4" style={{ background: `linear-gradient(135deg, ${TEAL}, #063033)` }}>
              <h3 className="text-sm font-black text-white">{editing?.id ? "Edit record" : "New record"}{student ? ` · ${student.name}` : ""}</h3>
              <p className="text-[11px]" style={{ color: "#9ec3c3" }}>Record the pattern, change, and actions taken.</p>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div><L>Pattern observed *</L>
                <textarea value={form.pattern} onChange={(e) => setForm((f) => ({ ...f, pattern: e.target.value }))} rows={3} placeholder="What pattern is seen for the student?" className="w-full px-3 py-2.5 border rounded-xl text-xs bg-white resize-none focus:outline-none" style={{ borderColor: "#dbe8e8" }} /></div>
              <div><L>Change vs. last record *</L>
                <div className="flex flex-wrap gap-2">{CHANGE.map((c) => (
                  <button key={c.key} onClick={() => setForm((f) => ({ ...f, change_vs_last_month: c.key }))} className="px-3 py-1.5 rounded-lg text-[11px] font-bold border" style={form.change_vs_last_month === c.key ? { background: TEAL, color: "#fff", borderColor: TEAL } : { background: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}>{c.label}</button>
                ))}</div></div>
              <div><L>Actions taken</L>
                <div className="flex flex-wrap gap-2">{ACTIONS.map((a) => (
                  <button key={a} onClick={() => toggleAction(a)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border" style={form.actions_taken.includes(a) ? { background: "#E8F6F6", color: TEAL, borderColor: TEAL_LT } : { background: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}>{a}</button>
                ))}</div></div>
              <div><L>Impact of actions</L><textarea value={form.actions_impact} onChange={(e) => setForm((f) => ({ ...f, actions_impact: e.target.value }))} rows={2} className="w-full px-3 py-2 border rounded-xl text-xs bg-white resize-none focus:outline-none" style={{ borderColor: "#dbe8e8" }} /></div>
              <div><L>What to try next</L><textarea value={form.next_month_plan} onChange={(e) => setForm((f) => ({ ...f, next_month_plan: e.target.value }))} rows={2} className="w-full px-3 py-2 border rounded-xl text-xs bg-white resize-none focus:outline-none" style={{ borderColor: "#dbe8e8" }} /></div>
            </div>
            <div className="px-5 py-3 border-t flex justify-end gap-2" style={{ background: "#fafcfc", borderColor: "#eef4f4" }}>
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl">Cancel</button>
              <button onClick={submit} disabled={busy} className="px-5 py-2 text-xs font-bold text-white rounded-xl disabled:opacity-50" style={{ background: `linear-gradient(120deg, ${TEAL_LT}, ${TEAL})` }}>{busy ? "Saving…" : editing?.id ? "Save" : "Add record"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const L = ({ children }) => <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">{children}</label>;
