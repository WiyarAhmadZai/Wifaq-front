import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listPlans } from "../../api/planning";
import { useAuth } from "../../admin/context/AuthContext";
import { PageHeader, StatGrid, Section, Spinner, EmptyState } from "../../components/hr/HrUI";
import { StatusPill, ProgressBar, planProgress } from "./planUtils";

const ICON = "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z";

// PDCA loop — Plan / Do / Check / Act (WEN vocab: Guide · Gauge · Govern).
const PDCA = [
  { k: "P", label: "Plan", sub: "Draft + approve", states: ["draft", "submitted", "approved"], tone: "bg-blue-50 text-blue-700" },
  { k: "D", label: "Do", sub: "Cascade · execute", states: ["active"], tone: "bg-emerald-50 text-emerald-700" },
  { k: "C", label: "Check", sub: "Mid-cycle check-in", states: ["active"], tone: "bg-amber-50 text-amber-700" },
  { k: "A", label: "Act", sub: "Reflect · archive", states: ["completed", "archived"], tone: "bg-purple-50 text-purple-700" },
];

export default function PlanningDashboard() {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const canCreate = hasPermission("planning.create") || hasPermission("planning.manage");

  useEffect(() => {
    listPlans()
      .then((r) => setPlans(r.data?.data || r.data || []))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, []);

  const active = plans.filter((p) => p.status === "active");
  const submitted = plans.filter((p) => p.status === "submitted");

  const stats = [
    { label: "Active plans", value: active.length, tone: "emerald", icon: "M5 13l4 4L19 7" },
    { label: "Awaiting approval", value: submitted.length, tone: "amber", icon: "M12 8v4l3 3" },
    { label: "Drafts", value: plans.filter((p) => p.status === "draft").length, tone: "blue", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" },
    { label: "Total plans", value: plans.length, tone: "teal", icon: ICON },
  ];

  if (loading) return <div className="py-20 text-center"><Spinner /></div>;

  return (
    <div className="px-4 py-5">
      <PageHeader
        title={`Planning${user?.name ? ` · ${user.name.split(" ")[0]}` : ""}`}
        subtitle="Your plans, approvals and progress at a glance"
        icon={ICON}
        actions={canCreate && (
          <button onClick={() => navigate("/planning/plans/create")} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-teal-700 text-xs font-bold rounded-xl hover:bg-teal-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Plan
          </button>
        )}
      />

      <StatGrid stats={stats} />

      {/* PDCA loop */}
      <Section title="The PDCA loop" subtitle="Plan → Do → Check → Act · Guide · Gauge · Govern" icon="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PDCA.map((p) => {
            const count = plans.filter((pl) => p.states.includes(pl.status)).length;
            return (
              <div key={p.k} className={`rounded-xl p-4 text-center ${p.tone}`}>
                <div className="text-3xl font-black leading-none">{p.k}</div>
                <div className="text-xs font-bold mt-1.5">{p.label}</div>
                <div className="text-[10px] opacity-70 mt-0.5">{p.sub}</div>
                <div className="text-[11px] font-semibold mt-1">{count} plan(s)</div>
              </div>
            );
          })}
        </div>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <Section title="Active goals at a glance" subtitle="Where your live plans stand" icon="M9 12l2 2 4-4">
          {active.length === 0 ? (
            <EmptyState icon={ICON} title="No active plans" description="Approved plans appear here while they run." />
          ) : (
            <div className="space-y-3">
              {active.map((p) => {
                const prog = planProgress(p);
                return (
                  <button key={p.id} onClick={() => navigate(`/planning/plans/show/${p.id}`)} className="w-full text-left rounded-xl border border-gray-100 p-3 hover:bg-gray-50">
                    <div className="flex justify-between items-center gap-2 mb-1.5">
                      <span className="font-semibold text-gray-800 text-sm">{p.title}</span>
                      <StatusPill status={p.status} />
                    </div>
                    <div className="text-[11px] text-gray-400 mb-1.5">{p.period_label || p.period_year || "—"} · {p.objectives_count ?? 0} obj · {p.items_count ?? 0} items</div>
                    <ProgressBar value={prog} />
                    <div className="text-[10px] text-gray-400 mt-1">{prog}% complete</div>
                  </button>
                );
              })}
            </div>
          )}
        </Section>

        <div className="space-y-4">
          <Section title="What needs you" icon="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5">
            {submitted.length === 0 ? (
              <p className="text-xs text-gray-400">Nothing waiting on you right now.</p>
            ) : (
              <div className="space-y-2">
                {submitted.map((p) => (
                  <button key={p.id} onClick={() => navigate(`/planning/plans/show/${p.id}`)} className="w-full text-left flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50">
                    <span className="text-amber-500">●</span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-700 truncate">{p.title}</div>
                      <div className="text-[10px] text-gray-400">Awaiting approval · {p.owner?.name || "—"}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
