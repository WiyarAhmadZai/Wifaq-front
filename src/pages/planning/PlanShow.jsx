import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import {
  getPlan, submitPlan, approvePlan, rejectPlan, completePlan, archivePlan, addDiscussion,
} from "../../api/planning";
import { useAuth } from "../../admin/context/AuthContext";
import { PageHeader, Section, Spinner, EmptyState } from "../../components/hr/HrUI";
import { fmtDate } from "../../utils/formErrors";
import { StatusPill, DimensionBadge, ProgressBar, Balance4D, balanceFromPlan } from "./planUtils";

const ICON = "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2";

export default function PlanShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [plan, setPlan] = useState(null);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await getPlan(id);
      setPlan(res.data?.data || res.data);
      setMeta(res.data?.meta || {});
    } catch {
      setPlan(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [id]);

  const canManage = meta.can_manage;
  const canApprove = meta.can_approve;
  const st = plan?.status;

  const run = async (fn, okTitle, after) => {
    setBusy(true);
    try { const r = await fn(); await load(); setNote(""); if (after) after(r); else Swal.fire({ icon: "success", title: okTitle, timer: 1200, showConfirmButton: false }); }
    catch (e) { Swal.fire("Error", e.response?.data?.message || "Failed", "error"); }
    finally { setBusy(false); }
  };

  const doApprove = async () => {
    const c = await Swal.fire({ title: "Approve & cascade?", html: "Creates real <b>Tasks, Events</b> and routes <b>Budget requests</b> from the plan items. Cannot be undone.", icon: "question", showCancelButton: true, confirmButtonColor: "#0d9488", confirmButtonText: "Approve & cascade" });
    if (!c.isConfirmed) return;
    run(() => approvePlan(id, note), null, (r) => {
      const s = r.data?.cascade || {};
      Swal.fire("Approved", `Cascade complete — ${s.tasks || 0} task(s), ${s.events || 0} event(s), ${s.budget_requests || 0} budget request(s), ${s.notifications || 0} notification(s).`, "success");
    });
  };
  const doReject = () => { if (!note.trim()) return Swal.fire("Note required", "Please note what needs revising.", "warning"); run(() => rejectPlan(id, note), "Revision requested"); };
  const doArchive = async () => {
    if (!meta.has_reflection) { Swal.fire("Reflection required", "Complete the reflection before archiving.", "warning"); return; }
    const c = await Swal.fire({ title: "Archive this plan?", icon: "question", showCancelButton: true, confirmButtonText: "Archive" });
    if (c.isConfirmed) run(() => archivePlan(id), "Plan archived");
  };
  const postComment = () => { if (note.trim()) run(() => addDiscussion(id, note), "Note added"); };

  if (loading) return <div className="py-20 text-center"><Spinner /></div>;
  if (!plan) return <div className="px-4 py-5"><EmptyState title="Plan not found" description="It may have been removed or you don't have access." /></div>;

  return (
    <div className="px-4 py-5">
      <PageHeader
        title={plan.title}
        subtitle={`${plan.type} · ${plan.period_year || "—"} · owner ${plan.owner?.name || "—"}`}
        icon={ICON}
        actions={
          <div className="flex flex-wrap gap-2 justify-end">
            {canManage && st === "draft" && (
              <button onClick={() => navigate(`/planning/plans/edit/${plan.id}`)} className="px-3 py-2 bg-white/15 text-white text-xs font-semibold rounded-xl hover:bg-white/25">Edit</button>
            )}
            {canManage && st === "draft" && (
              <button onClick={() => run(() => submitPlan(id), "Submitted")} disabled={busy} className="px-3 py-2 bg-white text-teal-700 text-xs font-bold rounded-xl hover:bg-teal-50 disabled:opacity-50">Submit</button>
            )}
            {st === "active" && (
              <>
                <button onClick={() => navigate(`/planning/plans/checkin/${plan.id}`)} className="px-3 py-2 bg-white/15 text-white text-xs font-semibold rounded-xl hover:bg-white/25">Check in</button>
                {plan.cascaded_at && <button onClick={() => navigate(`/planning/plans/cascade/${plan.id}`)} className="px-3 py-2 bg-white/15 text-white text-xs font-semibold rounded-xl hover:bg-white/25">Cascade result</button>}
                {canManage && <button onClick={() => run(() => completePlan(id), "Marked completed")} disabled={busy} className="px-3 py-2 bg-white text-teal-700 text-xs font-bold rounded-xl hover:bg-teal-50 disabled:opacity-50">Complete</button>}
              </>
            )}
            {st === "completed" && canManage && (
              <>
                <button onClick={() => navigate(`/planning/plans/reflect/${plan.id}`)} className="px-3 py-2 bg-white text-teal-700 text-xs font-bold rounded-xl hover:bg-teal-50">Reflect</button>
                <button onClick={doArchive} disabled={busy} className="px-3 py-2 bg-white/15 text-white text-xs font-semibold rounded-xl hover:bg-white/25 disabled:opacity-50">Archive</button>
              </>
            )}
          </div>
        }
      />

      <div className="flex items-center flex-wrap gap-2 mb-4">
        <StatusPill status={plan.status} />
        {plan.approved_at && <span className="text-[11px] text-gray-400">Approved {fmtDate(plan.approved_at)}</span>}
        {plan.parent && <span className="text-[11px] text-gray-400">Inherits from <b className="text-gray-600">{plan.parent.title}</b></span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <div>
          {plan.narrative && (
            <Section title="Narrative" icon="M4 6h16M4 12h16M4 18h7"><p className="text-sm text-gray-600 leading-relaxed">{plan.narrative}</p></Section>
          )}

          <Section title="Goals" subtitle={`${plan.objectives?.length || 0} objectives`} icon="M9 12l2 2 4-4">
            {(plan.objectives || []).length === 0 ? <p className="text-sm text-gray-400">No objectives.</p> : (
              <div className="space-y-4">
                {plan.objectives.map((o) => (
                  <div key={o.id} className="rounded-xl border border-gray-100 p-4 bg-gray-50/50">
                    <div className="flex justify-between items-start gap-3 mb-2">
                      <h4 className="text-sm font-bold text-gray-800">{o.statement}</h4>
                      <DimensionBadge dimension={o.primary_4d_dimension} />
                    </div>
                    <div className="space-y-2">
                      {(o.key_results || []).map((k) => (
                        <div key={k.id} className="bg-white rounded-lg border border-gray-100 p-2.5">
                          <div className="text-xs font-semibold text-gray-700 mb-1">{k.statement}</div>
                          <div className="flex flex-wrap gap-3 text-[11px] text-gray-500 mb-1.5">
                            <span>Base: <b className="text-gray-700">{k.baseline ?? "—"}{k.unit}</b></span>
                            <span>Target: <b className="text-gray-700">{k.target ?? "—"}{k.unit}</b></span>
                            <span>Now: <b className="text-gray-700">{k.current_value ?? "—"}{k.unit}</b></span>
                            {k.confidence_score != null && <span className={`ml-auto ${k.at_risk ? "text-red-600" : "text-emerald-600"}`}>▲ {k.confidence_score}{k.at_risk ? " · at risk" : ""}</span>}
                          </div>
                          <ProgressBar value={k.progress} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Items" subtitle="Tasks · Events · Budget requests" icon="M4 6h16M4 12h16M4 18h7">
            {(plan.items || []).length === 0 ? <p className="text-sm text-gray-400">No items.</p> : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                    <th className="text-left py-2 font-bold">Item</th>
                    <th className="text-left py-2 font-bold">Driver</th>
                    <th className="text-left py-2 font-bold">Due</th>
                    <th className="text-left py-2 font-bold">Budget</th>
                    <th className="text-left py-2 font-bold">State</th>
                    <th className="text-left py-2 font-bold">Linked</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.items.map((it) => (
                    <tr key={it.id} className="border-b border-gray-50">
                      <td className="py-2 text-gray-700 font-medium">{it.title}</td>
                      <td className="py-2 text-gray-500">{it.driver || "—"}</td>
                      <td className="py-2 text-gray-500">{it.due_date ? fmtDate(it.due_date) : "—"}</td>
                      <td className="py-2 text-gray-500">{it.budget_amount ? `${Number(it.budget_amount).toLocaleString()} AFN` : "—"}</td>
                      <td className="py-2"><StateChip state={it.state} /></td>
                      <td className="py-2 font-mono text-[10px] text-gray-400">
                        {it.cascaded_task_id ? `T-${it.cascaded_task_id}` : ""}{it.cascaded_event_id ? ` · E-${it.cascaded_event_id}` : ""}{!it.cascaded_task_id && !it.cascaded_event_id ? "—" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          {/* Discussion / Mashwara + decision record */}
          <Section title="Discussion" subtitle="Mashwara thread · logged as decision record" icon="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z">
            <div className="space-y-3 mb-4">
              {(plan.discussions || []).length === 0 && <p className="text-xs text-gray-400">No discussion yet.</p>}
              {(plan.discussions || []).map((d) => (
                <div key={d.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{(d.user?.name || "?").charAt(0).toUpperCase()}</div>
                  <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-700">{d.user?.name || "Unknown"}</span>
                      {d.type !== "comment" && <StatusPill status={d.type} />}
                      {d.meeting && <span className="text-[10px] text-gray-400">in meeting: {d.meeting.title}</span>}
                      <span className="text-[10px] text-gray-400 ml-auto">{fmtDate(d.created_at)}</span>
                    </div>
                    {d.body && <p className="text-xs text-gray-600 mt-1 leading-relaxed">{d.body}</p>}
                  </div>
                </div>
              ))}
            </div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
              placeholder={st === "submitted" && canApprove ? "Note your decision rationale, or add a comment…" : "Add a note…"}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500" />
            <div className="flex flex-wrap gap-2 mt-2">
              <button onClick={postComment} disabled={busy || !note.trim()} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-40">Add note</button>
              {st === "submitted" && canApprove && (
                <>
                  <button onClick={doReject} disabled={busy} className="px-3 py-1.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg hover:bg-amber-200 disabled:opacity-50">Request revision</button>
                  <button onClick={doApprove} disabled={busy} className="px-3 py-1.5 bg-teal-600 text-white text-xs font-bold rounded-lg hover:bg-teal-700 disabled:opacity-50">✓ Approve &amp; cascade</button>
                </>
              )}
            </div>
          </Section>
        </div>

        {/* Side rail */}
        <div className="space-y-4">
          <Section title="4D coverage" icon="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z">
            <Balance4D counts={balanceFromPlan(plan)} />
          </Section>

          {plan.cascade_summary && (
            <Section title="Cascade result" icon="M13 10V3L4 14h7v7l9-11h-7z" action={<button onClick={() => navigate(`/planning/plans/cascade/${plan.id}`)} className="text-xs font-semibold text-teal-600">Open →</button>}>
              <div className="text-sm space-y-1.5">
                <Row k="Tasks">{plan.cascade_summary.tasks ?? 0}</Row>
                <Row k="Events">{plan.cascade_summary.events ?? 0}</Row>
                <Row k="Budget requests">{plan.cascade_summary.budget_requests ?? 0}</Row>
                <Row k="Notifications">{plan.cascade_summary.notifications ?? 0}</Row>
              </div>
            </Section>
          )}

          <Section title="Quick facts" icon="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z">
            <div className="text-sm space-y-1.5">
              <Row k="State"><StatusPill status={plan.status} /></Row>
              <Row k="Type"><span className="capitalize">{plan.type}</span></Row>
              <Row k="Period">{plan.period_year || "—"}{plan.period_month ? ` · m${plan.period_month}` : ""}{plan.period_week ? ` · w${plan.period_week}` : ""}</Row>
              <Row k="Department">{plan.department?.name || "—"}</Row>
              <Row k="Owner">{plan.owner?.name || "—"}</Row>
              <Row k="Approver">{plan.approver?.name || "—"}</Row>
              <Row k="Items">{plan.items?.length || 0}</Row>
              {plan.start_date && <Row k="Window">{fmtDate(plan.start_date)} → {fmtDate(plan.end_date)}</Row>}
            </div>
          </Section>

          {(plan.children || []).length > 0 && (
            <Section title="Child plans" icon="M4 6h16M4 12h16M4 18h7">
              <div className="space-y-1.5">
                {plan.children.map((c) => (
                  <button key={c.id} onClick={() => navigate(`/planning/plans/show/${c.id}`)} className="w-full text-left px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-xs flex justify-between items-center">
                    <span className="font-medium text-gray-700">{c.title}</span><StatusPill status={c.status} />
                  </button>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, children }) {
  return (
    <div className="flex justify-between items-center gap-2 border-b border-gray-50 pb-1.5 last:border-0">
      <span className="text-gray-400 text-xs">{k}</span>
      <span className="text-gray-700 text-xs font-medium text-right">{children}</span>
    </div>
  );
}

function StateChip({ state }) {
  const map = {
    planned: "bg-gray-100 text-gray-600", in_progress: "bg-blue-100 text-blue-700",
    done: "bg-emerald-100 text-emerald-700", missed: "bg-red-100 text-red-700",
    carried_over: "bg-amber-100 text-amber-700",
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[state] || map.planned}`}>{(state || "planned").replace("_", " ")}</span>;
}
