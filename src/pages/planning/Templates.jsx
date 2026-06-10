import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listPlans } from "../../api/planning";
import { PageHeader, Section, Spinner, InfoNote } from "../../components/hr/HrUI";
import { fmtDateTime } from "../../utils/formErrors";

const ICON = "M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a1 1 0 01-1-1V11a1 1 0 011-1h1a2 2 0 100-4H4a1 1 0 01-1-1V4";

// Build an append-only-style activity feed from each plan's workflow stamps.
function buildAudit(plans) {
  const events = [];
  plans.forEach((p) => {
    const push = (at, type, detail) => at && events.push({ at, type, detail, plan: p });
    push(p.submitted_at, "plan.submitted", `${p.title} submitted for approval`);
    push(p.approved_at, "plan.approved", `${p.title} approved`);
    push(p.cascaded_at, "cascade.fired", `${p.title} cascaded` + (p.cascade_summary ? ` · ${p.cascade_summary.tasks || 0} tasks, ${p.cascade_summary.events || 0} events` : ""));
    push(p.completed_at, "plan.completed", `${p.title} marked completed`);
    push(p.archived_at, "plan.archived", `${p.title} archived`);
  });
  return events.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 30);
}

export default function Templates() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPlans().then((r) => setPlans(r.data?.data || r.data || [])).catch(() => setPlans([])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-20 text-center"><Spinner /></div>;

  const audit = buildAudit(plans);

  return (
    <div className="px-4 py-5">
      <PageHeader title="Templates & Audit" subtitle="Reusable plan starters and the activity log" icon={ICON} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Templates" subtitle="Reusable plan starters" icon={ICON}>
          <InfoNote tone="amber" title="Phase 2">
            Saveable plan templates (PlanTemplate) land in phase 2 of WEN-DEV-PLANNING-002. For now, start a plan
            from one of the three period types and inherit objectives from a parent plan.
          </InfoNote>
          <div className="space-y-2">
            {[
              { t: "Annual Plan", d: "Frames the whole year · seeds monthly plans", type: "annual" },
              { t: "Monthly Plan", d: "Inherits from the annual plan", type: "monthly" },
              { t: "Weekly Quick", d: "Inherits from the monthly plan", type: "weekly" },
            ].map((s) => (
              <button key={s.type} onClick={() => navigate("/planning/plans/create")} className="w-full text-left rounded-xl border border-gray-100 p-3 hover:bg-gray-50 flex justify-between items-center">
                <div><div className="text-sm font-semibold text-gray-800">{s.t}</div><div className="text-[11px] text-gray-400">{s.d}</div></div>
                <span className="text-teal-600 text-xs font-bold">Start →</span>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Recent activity" subtitle="Append-only plan event log" icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z">
          {audit.length === 0 ? <p className="text-xs text-gray-400">No activity yet.</p> : (
            <div className="space-y-2">
              {audit.map((e, i) => (
                <button key={i} onClick={() => navigate(`/planning/plans/show/${e.plan.id}`)} className="w-full text-left py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50/60 rounded px-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-gray-400">{fmtDateTime(e.at)}</span>
                    <strong className="text-xs text-gray-700">{e.type}</strong>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{e.detail}</div>
                </button>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
