import { useState, useEffect, useCallback } from "react";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";
import Select2 from "../../components/hr/Select2";

const ACTIONS = [
  "Conversation with the student",
  "Contact with family",
  "Meeting with the mentor teacher",
  "Referral to counsellor",
  "Change in classroom environment",
];
const CHANGE = [
  { key: "better", label: "↑ Better" },
  { key: "same", label: "= Same" },
  { key: "worse", label: "↓ Worse" },
  { key: "unclear", label: "Not yet clear" },
];

const statusTone = {
  active: "bg-amber-100 text-amber-700",
  in_followup: "bg-blue-100 text-blue-700",
  cleared: "bg-emerald-100 text-emerald-700",
  assigned: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
};

export default function Monitoring() {
  const [tab, setTab] = useState("board");
  const [board, setBoard] = useState([]);
  const [canManage, setCanManage] = useState(false);
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mentors, setMentors] = useState([]);
  const [assignFor, setAssignFor] = useState(null); // monitoring row
  const [assignMentor, setAssignMentor] = useState("");
  const [fillFor, setFillFor] = useState(null); // followup row
  const [form, setForm] = useState({ pattern: "", change_vs_last_month: "", actions_taken: [], actions_impact: "", next_month_plan: "" });
  const [saving, setSaving] = useState(false);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    try {
      const r = await get("/student-monitorings");
      setBoard(r.data?.data || []);
      setCanManage(!!r.data?.can_manage);
    } catch { setBoard([]); }
    finally { setLoading(false); }
  }, []);

  const loadFollowups = useCallback(async () => {
    setLoading(true);
    try {
      const r = await get("/student-monitorings/followups");
      setFollowups(r.data?.data || []);
    } catch { setFollowups([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { tab === "board" ? loadBoard() : loadFollowups(); }, [tab, loadBoard, loadFollowups]);
  useEffect(() => { get("/student-monitorings/mentors").then((r) => setMentors(r.data?.data || [])).catch(() => setMentors([])); }, []);

  const openAssign = (row) => { setAssignMentor(row.this_month?.mentor_id || ""); setAssignFor(row); };
  const submitAssign = async () => {
    if (!assignMentor) { Swal.fire("Pick a mentor", "Select a mentor teacher for this month's follow-up.", "warning"); return; }
    setSaving(true);
    try {
      await post(`/student-monitorings/${assignFor.id}/assign`, { mentor_id: assignMentor });
      Swal.fire({ icon: "success", title: "Assigned", timer: 1200, showConfirmButton: false, toast: true, position: "top-end" });
      setAssignFor(null); loadBoard();
    } catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  const clearMon = async (row) => {
    const r = await Swal.fire({ title: "Clear from monitoring?", text: row.student, icon: "question", showCancelButton: true, confirmButtonColor: "#0d9488", confirmButtonText: "Clear" });
    if (!r.isConfirmed) return;
    try { await post(`/student-monitorings/${row.id}/clear`); loadBoard(); Swal.fire({ icon: "success", title: "Cleared", timer: 1100, showConfirmButton: false, toast: true, position: "top-end" }); }
    catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
  };

  const openFill = (f) => {
    setForm({
      pattern: f.pattern || "", change_vs_last_month: f.change_vs_last_month || "",
      actions_taken: f.actions_taken || [], actions_impact: f.actions_impact || "", next_month_plan: f.next_month_plan || "",
    });
    setFillFor(f);
  };
  const toggleAction = (a) => setForm((p) => ({ ...p, actions_taken: p.actions_taken.includes(a) ? p.actions_taken.filter((x) => x !== a) : [...p.actions_taken, a] }));
  const submitFill = async () => {
    if (!form.pattern.trim()) { Swal.fire("Missing", "Describe the pattern observed this month.", "warning"); return; }
    if (!form.change_vs_last_month) { Swal.fire("Missing", "Pick the change vs. last month.", "warning"); return; }
    setSaving(true);
    try {
      await put(`/student-monitorings/followups/${fillFor.id}`, form);
      Swal.fire({ icon: "success", title: "Follow-up recorded", timer: 1300, showConfirmButton: false, toast: true, position: "top-end" });
      setFillFor(null); loadFollowups();
    } catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="bg-teal-600 px-5 py-4">
        <h1 className="text-sm font-bold text-white">Under Monitoring</h1>
        <p className="text-xs text-teal-100 mt-0.5">Phase 2 · monthly follow-up for students who need a closer eye</p>
        <div className="flex gap-1 mt-3">
          {[{ k: "board", l: "Board" }, { k: "followups", l: "My Follow-ups" }].map((t) => (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${tab === t.k ? "bg-white text-teal-700" : "bg-white/15 text-white hover:bg-white/25"}`}>{t.l}</button>
          ))}
        </div>
      </div>

      <div className="px-4 py-5">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : tab === "board" ? (
          board.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-400">No students under monitoring.</div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr className="text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Student</th><th className="px-4 py-3">Class</th>
                      <th className="px-4 py-3 text-center">Obs.</th><th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">This month</th><th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {board.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3 font-semibold text-gray-800">{m.student}</td>
                        <td className="px-4 py-3 text-gray-600">{m.class || "—"}</td>
                        <td className="px-4 py-3 text-center">{m.obs_count}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[9px] font-bold capitalize ${statusTone[m.status] || "bg-gray-100 text-gray-600"}`}>{(m.status || "").replace("_", " ")}</span></td>
                        <td className="px-4 py-3">
                          {m.this_month ? (
                            <span className="text-[11px] text-gray-600">{m.this_month.mentor} · <span className={`font-semibold ${m.this_month.status === "completed" ? "text-emerald-600" : "text-amber-600"}`}>{m.this_month.status}</span></span>
                          ) : <span className="text-[11px] text-gray-400">Not assigned</span>}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {canManage && (
                            <>
                              <button onClick={() => openAssign(m)} className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-teal-700 hover:bg-teal-50">{m.this_month ? "Reassign" : "Assign"}</button>
                              <button onClick={() => clearMon(m)} className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-gray-500 hover:bg-gray-100">Clear</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          followups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-400">No follow-ups assigned to you.</div>
          ) : (
            <div className="space-y-2">
              {followups.map((f) => (
                <div key={f.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-800">{f.student}</p>
                    <p className="text-[11px] text-gray-500">{f.period} · {f.mentor}{f.pattern ? ` · ${f.pattern.slice(0, 60)}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold capitalize ${statusTone[f.status]}`}>{f.status}</span>
                    {f.editable && (
                      <button onClick={() => openFill(f)} className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-teal-600 hover:bg-teal-700">{f.status === "completed" ? "Edit" : "Fill"}</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Assign mentor modal */}
      {assignFor && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setAssignFor(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 bg-teal-600"><h3 className="text-sm font-bold text-white">Assign monthly follow-up</h3><p className="text-[11px] text-teal-100 mt-0.5">{assignFor.student}</p></div>
            <div className="p-5">
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Mentor teacher</label>
              <Select2 value={assignMentor} onChange={setAssignMentor}
                options={mentors.map((m) => ({ value: m.user_id, label: m.name }))} placeholder="Select a mentor…" />
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setAssignFor(null)} className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={submitAssign} disabled={saving} className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl disabled:opacity-50">{saving ? "Saving…" : "Assign"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Fill follow-up modal */}
      {fillFor && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setFillFor(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 bg-teal-600"><h3 className="text-sm font-bold text-white">Monthly follow-up · {fillFor.student}</h3><p className="text-[11px] text-teal-100 mt-0.5">{fillFor.period}</p></div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Pattern observed this month *</label>
                <textarea value={form.pattern} onChange={(e) => setForm((f) => ({ ...f, pattern: e.target.value }))} rows={3} placeholder="In one paragraph — what pattern is seen across this month's observations?" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white resize-none" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Change vs. last month *</label>
                <div className="flex flex-wrap gap-2">
                  {CHANGE.map((c) => (
                    <button key={c.key} onClick={() => setForm((f) => ({ ...f, change_vs_last_month: c.key }))}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border ${form.change_vs_last_month === c.key ? "bg-teal-600 text-white border-teal-600" : "bg-white border-gray-200 text-gray-600"}`}>{c.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Actions taken</label>
                <div className="flex flex-wrap gap-2">
                  {ACTIONS.map((a) => (
                    <button key={a} onClick={() => toggleAction(a)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border ${form.actions_taken.includes(a) ? "bg-teal-50 border-teal-300 text-teal-700" : "bg-white border-gray-200 text-gray-600"}`}>{a}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Impact of actions</label>
                <textarea value={form.actions_impact} onChange={(e) => setForm((f) => ({ ...f, actions_impact: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white resize-none" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">What to try next month</label>
                <textarea value={form.next_month_plan} onChange={(e) => setForm((f) => ({ ...f, next_month_plan: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white resize-none" />
              </div>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setFillFor(null)} className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={submitFill} disabled={saving} className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl disabled:opacity-50">{saving ? "Saving…" : "Record follow-up"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
