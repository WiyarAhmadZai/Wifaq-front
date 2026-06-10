import { useState, useEffect, useCallback } from "react";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";
import Select2 from "../../components/hr/Select2";

const TEAL = "#0D5C63", TEAL_LT = "#14919B", GOLD = "#C9A227", PAPER = "#F4F8F8";

const ACTIONS = ["Conversation with the student", "Contact with family", "Meeting with the mentor teacher", "Referral to counsellor", "Change in classroom environment"];
const CHANGE = [{ key: "better", label: "↑ Better" }, { key: "same", label: "= Same" }, { key: "worse", label: "↓ Worse" }, { key: "unclear", label: "Not clear" }];

const TONE = {
  active: { bg: "#fbf0db", fg: "#9a6a12", label: "Active" },
  in_followup: { bg: "#e0eefb", fg: "#3a5fa8", label: "In follow-up" },
  cleared: { bg: "#e6f3ec", fg: "#2E7D5B", label: "Cleared" },
  assigned: { bg: "#fbf0db", fg: "#9a6a12", label: "Assigned" },
  completed: { bg: "#e6f3ec", fg: "#2E7D5B", label: "Completed" },
};
const initials = (n) => (n || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const Spinner = () => <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: "#cfe4e4", borderTopColor: TEAL }} /></div>;
const Pill = ({ s }) => { const t = TONE[s] || { bg: "#eef3f3", fg: "#5d7273", label: s }; return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: t.bg, color: t.fg }}>{t.label}</span>; };

export default function Monitoring() {
  const [tab, setTab] = useState("board");
  const [board, setBoard] = useState([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mentors, setMentors] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detailFollowups, setDetailFollowups] = useState([]);
  const [assignMentor, setAssignMentor] = useState("");
  const [busy, setBusy] = useState(false);

  const [followups, setFollowups] = useState([]);
  const [fillFor, setFillFor] = useState(null);
  const [form, setForm] = useState({ pattern: "", change_vs_last_month: "", actions_taken: [], actions_impact: "", next_month_plan: "" });

  const loadBoard = useCallback(async () => {
    setLoading(true);
    try { const r = await get("/student-monitorings"); setBoard(r.data?.data || []); setCanManage(!!r.data?.can_manage); }
    catch { setBoard([]); } finally { setLoading(false); }
  }, []);
  const loadFollowups = useCallback(async () => {
    setLoading(true);
    try { const r = await get("/student-monitorings/followups"); setFollowups(r.data?.data || []); }
    catch { setFollowups([]); } finally { setLoading(false); }
  }, []);
  useEffect(() => { tab === "board" ? loadBoard() : loadFollowups(); }, [tab, loadBoard, loadFollowups]);
  useEffect(() => { get("/student-monitorings/mentors").then((r) => setMentors(r.data?.data || [])).catch(() => {}); }, []);

  const pick = async (row) => {
    setSelected(row); setAssignMentor(row.this_month?.mentor_id || ""); setDetailFollowups([]);
    try { const r = await get(`/student-monitorings/followups?student_id=${row.student_id}`); setDetailFollowups(r.data?.data || []); } catch { setDetailFollowups([]); }
  };

  const assign = async () => {
    if (!assignMentor) { Swal.fire("Pick a mentor", "Select a mentor teacher.", "warning"); return; }
    setBusy(true);
    try { await post(`/student-monitorings/${selected.id}/assign`, { mentor_id: assignMentor }); Swal.fire({ icon: "success", title: "Assigned", timer: 1100, showConfirmButton: false, toast: true, position: "top-end" }); await loadBoard(); pick(selected); }
    catch (e) { Swal.fire("Error", e.response?.data?.message || "Failed", "error"); } finally { setBusy(false); }
  };
  const clearMon = async () => {
    const r = await Swal.fire({ title: "Clear from monitoring?", text: selected.student, icon: "question", showCancelButton: true, confirmButtonColor: TEAL, confirmButtonText: "Clear" });
    if (!r.isConfirmed) return;
    try { await post(`/student-monitorings/${selected.id}/clear`); setSelected(null); loadBoard(); Swal.fire({ icon: "success", title: "Cleared", timer: 1000, showConfirmButton: false, toast: true, position: "top-end" }); }
    catch (e) { Swal.fire("Error", e.response?.data?.message || "Failed", "error"); }
  };

  const openFill = (f) => { setForm({ pattern: f.pattern || "", change_vs_last_month: f.change_vs_last_month || "", actions_taken: f.actions_taken || [], actions_impact: f.actions_impact || "", next_month_plan: f.next_month_plan || "" }); setFillFor(f); };
  const toggleAction = (a) => setForm((p) => ({ ...p, actions_taken: p.actions_taken.includes(a) ? p.actions_taken.filter((x) => x !== a) : [...p.actions_taken, a] }));
  const submitFill = async () => {
    if (!form.pattern.trim()) { Swal.fire("Missing", "Describe the pattern this month.", "warning"); return; }
    if (!form.change_vs_last_month) { Swal.fire("Missing", "Pick the change vs. last month.", "warning"); return; }
    setBusy(true);
    try { await put(`/student-monitorings/followups/${fillFor.id}`, form); Swal.fire({ icon: "success", title: "Recorded", timer: 1200, showConfirmButton: false, toast: true, position: "top-end" }); setFillFor(null); loadFollowups(); }
    catch (e) { Swal.fire("Error", e.response?.data?.message || "Failed", "error"); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen" style={{ background: PAPER }}>
      <div className="px-5 py-4" style={{ background: `linear-gradient(135deg, ${TEAL}, #063033)` }}>
        <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: GOLD }}>Education & Formation · Layer 2</p>
        <h1 className="text-base font-black text-white mt-0.5">Under Monitoring</h1>
        <div className="flex gap-1.5 mt-3">
          {[{ k: "board", l: "Board" }, { k: "followups", l: "My Follow-ups" }].map((t) => (
            <button key={t.k} onClick={() => { setTab(t.k); setSelected(null); }} className="px-4 py-1.5 rounded-full text-[11px] font-bold transition-all"
              style={tab === t.k ? { background: "#fff", color: TEAL } : { background: "rgba(255,255,255,.12)", color: "#cfe4e4" }}>{t.l}</button>
          ))}
        </div>
      </div>

      {tab === "followups" ? (
        <div className="max-w-3xl mx-auto px-4 py-5">
          {loading ? <Spinner /> : followups.length === 0 ? <p className="text-center text-sm text-gray-400 py-12">No follow-ups assigned to you.</p> : (
            <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#dbe8e8" }}>
              {followups.map((f, i) => (
                <div key={f.id} className={`flex items-center gap-3 px-4 py-3 ${i ? "border-t" : ""}`} style={{ borderColor: "#eef4f4" }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-black text-white flex-shrink-0" style={{ background: `linear-gradient(140deg, ${TEAL_LT}, ${TEAL})` }}>{initials(f.student)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-800 truncate">{f.student}</p>
                    <p className="text-[10px] text-gray-400">{f.period}{f.pattern ? ` · ${f.pattern.slice(0, 50)}` : ""}</p>
                  </div>
                  <Pill s={f.status} />
                  {f.editable && <button onClick={() => openFill(f)} className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white" style={{ background: `linear-gradient(120deg, ${TEAL_LT}, ${TEAL})` }}>{f.status === "completed" ? "Edit" : "Fill"}</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-6xl mx-auto lg:grid lg:grid-cols-[320px_1fr]">
          {/* LEFT list */}
          <aside className={`border-r ${selected ? "hidden lg:block" : ""}`} style={{ borderColor: "#dbe8e8", background: "#fff" }}>
            <div className="px-4 py-2.5 border-b text-[10px] font-bold uppercase tracking-wider text-gray-400" style={{ borderColor: "#eef4f4" }}>{board.length} student{board.length === 1 ? "" : "s"} under monitoring</div>
            <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 180px)" }}>
              {loading ? <Spinner /> : board.length === 0 ? <p className="p-6 text-center text-xs text-gray-400">No students under monitoring.</p> : board.map((m) => {
                const on = selected?.id === m.id;
                return (
                  <button key={m.id} onClick={() => pick(m)} className="w-full flex items-center gap-3 px-3 py-2.5 text-left border-l-2" style={on ? { background: "#E8F6F6", borderColor: TEAL } : { background: "transparent", borderColor: "transparent" }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-black text-white flex-shrink-0" style={{ background: `linear-gradient(140deg, ${TEAL_LT}, ${TEAL})` }}>{initials(m.student)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-800 truncate">{m.student}</p>
                      <p className="text-[10px] text-gray-400">{m.class || "—"} · {m.obs_count} obs</p>
                    </div>
                    <Pill s={m.status} />
                  </button>
                );
              })}
            </div>
          </aside>

          {/* RIGHT detail */}
          <main className={`${selected ? "" : "hidden lg:block"}`}>
            {!selected ? (
              <div className="flex flex-col items-center justify-center text-center p-10" style={{ minHeight: "60vh" }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: "#E8F6F6", color: TEAL }}>🔎</div>
                <p className="text-sm font-bold text-gray-600">Select a student</p>
                <p className="text-xs text-gray-400 mt-1">Pick someone to assign a mentor and view their monthly follow-ups.</p>
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
                    <p className="text-[11px] text-gray-400">{selected.class || "—"} · flagged {selected.flagged_on}{selected.flagged_by ? ` by ${selected.flagged_by}` : ""}</p>
                  </div>
                  <Pill s={selected.status} />
                </div>

                <div className="p-5 space-y-5">
                  {selected.reason && (
                    <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg,#fbf7ec,#fff)" }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Why flagged</p>
                      <p className="text-xs text-gray-700">{selected.reason}</p>
                    </div>
                  )}

                  {/* This month assignment */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">This month's follow-up</p>
                    {selected.this_month ? (
                      <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: "#E8F6F6" }}>
                        <span className="text-xs text-gray-700">Mentor: <b>{selected.this_month.mentor}</b></span>
                        <Pill s={selected.this_month.status} />
                      </div>
                    ) : <p className="text-xs text-gray-400">Not assigned yet.</p>}

                    {canManage && (
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1"><Select2 value={assignMentor} onChange={setAssignMentor} options={mentors.map((m) => ({ value: m.user_id, label: m.name }))} placeholder="Assign a mentor…" /></div>
                        <button onClick={assign} disabled={busy} className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50 flex-shrink-0" style={{ background: `linear-gradient(120deg, ${TEAL_LT}, ${TEAL})` }}>{selected.this_month ? "Reassign" : "Assign"}</button>
                        <button onClick={clearMon} className="px-3 py-2 rounded-xl text-xs font-bold flex-shrink-0" style={{ background: "#f3f4f6", color: "#6b7280" }}>Clear</button>
                      </div>
                    )}
                  </div>

                  {/* Follow-up history */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Monthly follow-ups</p>
                    {detailFollowups.length === 0 ? <p className="text-xs text-gray-400">No monthly follow-ups recorded yet.</p> : (
                      <div className="relative pl-5" style={{ borderLeft: "2px solid #e7f1f1", marginLeft: "4px" }}>
                        {detailFollowups.map((f) => (
                          <div key={f.id} className="relative pb-5 last:pb-0">
                            <span className="absolute -left-[27px] top-1 w-3 h-3 rounded-full border-2 border-white" style={{ background: f.status === "completed" ? "#2E7D5B" : "#C9A227" }} />
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-gray-800">{f.period} · {f.mentor}</span>
                              <Pill s={f.status} />
                            </div>
                            {f.pattern && <p className="text-xs text-gray-700">{f.pattern}</p>}
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-gray-500">
                              {f.change_vs_last_month && <span>Change: <b className="text-gray-700">{f.change_vs_last_month}</b></span>}
                              {(f.actions_taken || []).length > 0 && <span>{f.actions_taken.length} action{f.actions_taken.length === 1 ? "" : "s"}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Fill follow-up modal */}
      {fillFor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(5,37,40,.45)", backdropFilter: "blur(3px)" }} onClick={() => setFillFor(null)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-lg w-full max-h-[94vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4" style={{ background: `linear-gradient(135deg, ${TEAL}, #063033)` }}>
              <h3 className="text-sm font-black text-white">Monthly follow-up · {fillFor.student}</h3>
              <p className="text-[11px]" style={{ color: "#9ec3c3" }}>{fillFor.period}</p>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div><L>Pattern observed this month *</L>
                <textarea value={form.pattern} onChange={(e) => setForm((f) => ({ ...f, pattern: e.target.value }))} rows={3} placeholder="What pattern is seen across this month's observations?" className="w-full px-3 py-2.5 border rounded-xl text-xs bg-white resize-none focus:outline-none" style={{ borderColor: "#dbe8e8" }} /></div>
              <div><L>Change vs. last month *</L>
                <div className="flex flex-wrap gap-2">{CHANGE.map((c) => (
                  <button key={c.key} onClick={() => setForm((f) => ({ ...f, change_vs_last_month: c.key }))} className="px-3 py-1.5 rounded-lg text-[11px] font-bold border" style={form.change_vs_last_month === c.key ? { background: TEAL, color: "#fff", borderColor: TEAL } : { background: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}>{c.label}</button>
                ))}</div></div>
              <div><L>Actions taken</L>
                <div className="flex flex-wrap gap-2">{ACTIONS.map((a) => (
                  <button key={a} onClick={() => toggleAction(a)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border" style={form.actions_taken.includes(a) ? { background: "#E8F6F6", color: TEAL, borderColor: TEAL_LT } : { background: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}>{a}</button>
                ))}</div></div>
              <div><L>Impact of actions</L><textarea value={form.actions_impact} onChange={(e) => setForm((f) => ({ ...f, actions_impact: e.target.value }))} rows={2} className="w-full px-3 py-2 border rounded-xl text-xs bg-white resize-none focus:outline-none" style={{ borderColor: "#dbe8e8" }} /></div>
              <div><L>What to try next month</L><textarea value={form.next_month_plan} onChange={(e) => setForm((f) => ({ ...f, next_month_plan: e.target.value }))} rows={2} className="w-full px-3 py-2 border rounded-xl text-xs bg-white resize-none focus:outline-none" style={{ borderColor: "#dbe8e8" }} /></div>
            </div>
            <div className="px-5 py-3 border-t flex justify-end gap-2" style={{ background: "#fafcfc", borderColor: "#eef4f4" }}>
              <button onClick={() => setFillFor(null)} className="px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl">Cancel</button>
              <button onClick={submitFill} disabled={busy} className="px-5 py-2 text-xs font-bold text-white rounded-xl disabled:opacity-50" style={{ background: `linear-gradient(120deg, ${TEAL_LT}, ${TEAL})` }}>{busy ? "Saving…" : "Record"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const L = ({ children }) => <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">{children}</label>;
