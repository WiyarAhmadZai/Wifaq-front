import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPlan } from "../../api/planning";
import { PageHeader, Section, Spinner, EmptyState } from "../../components/hr/HrUI";
import { fmtDateTime } from "../../utils/formErrors";

const ICON = "M13 10V3L4 14h7v7l9-11h-7z";

export default function CascadeResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlan(id).then((r) => setPlan(r.data?.data || r.data)).catch(() => setPlan(null)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="py-20 text-center"><Spinner /></div>;
  if (!plan) return <div className="px-4 py-5"><Section title="Plan not found" /></div>;

  const s = plan.cascade_summary;
  const items = plan.items || [];

  const cards = [
    { icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2", n: s?.tasks ?? 0, label: "Tasks created", sub: "Staff Tasks", tone: "bg-teal-50 text-teal-700" },
    { icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", n: s?.events ?? 0, label: "Events scheduled", sub: "Date-anchored items", tone: "bg-amber-50 text-amber-700" },
    { icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1", n: s?.budget_requests ?? 0, label: "Budget requests", sub: `${Number(s?.budget_total || 0).toLocaleString()} AFN · routed to Finance`, tone: "bg-emerald-50 text-emerald-700" },
    { icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5", n: s?.notifications ?? 0, label: "Notifications sent", sub: "To assignees", tone: "bg-blue-50 text-blue-700" },
  ];

  return (
    <div className="px-4 py-5">
      <PageHeader title={`Cascade · ${plan.title}`}
        subtitle={plan.cascaded_at ? `Approved ${fmtDateTime(plan.cascaded_at)} · single transactional cascade` : "Not yet cascaded"}
        icon={ICON}
        actions={<button onClick={() => navigate(`/planning/plans/show/${id}`)} className="px-3 py-2 bg-white/15 text-white text-xs font-semibold rounded-xl hover:bg-white/25">Back to plan</button>} />

      {!s ? (
        <EmptyState icon={ICON} title="No cascade yet" description="This plan has not been approved, so nothing has been cascaded into Tasks, Events or Budget." />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {cards.map((c) => (
              <div key={c.label} className={`rounded-2xl p-4 ${c.tone}`}>
                <svg className="w-5 h-5 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={c.icon} /></svg>
                <div className="text-3xl font-black text-gray-800">{c.n}</div>
                <div className="text-xs font-bold mt-1">{c.label}</div>
                <div className="text-[10px] opacity-70 mt-0.5">{c.sub}</div>
              </div>
            ))}
          </div>

          <Section title="What was created" subtitle="Each plan item and the rows it produced" icon="M4 6h16M4 12h16M4 18h7">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  <th className="text-left py-2 font-bold">Item</th>
                  <th className="text-left py-2 font-bold">Task</th>
                  <th className="text-left py-2 font-bold">Event</th>
                  <th className="text-left py-2 font-bold">Budget</th>
                  <th className="text-left py-2 font-bold">State</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700 font-medium">{it.title}</td>
                    <td className="py-2 font-mono text-[10px] text-gray-500">{it.cascaded_task_id ? `T-${it.cascaded_task_id}` : "—"}</td>
                    <td className="py-2 font-mono text-[10px] text-gray-500">{it.cascaded_event_id ? `E-${it.cascaded_event_id}` : "—"}</td>
                    <td className="py-2 text-gray-500">{it.budget_amount ? `${Number(it.budget_amount).toLocaleString()} AFN` : "—"}</td>
                    <td className="py-2 capitalize text-gray-500">{(it.state || "planned").replace("_", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </>
      )}
    </div>
  );
}
