import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listPlans } from "../../api/planning";
import { PageHeader, Section, Spinner, EmptyState } from "../../components/hr/HrUI";
import { StatusPill, DimensionBadge, ProgressBar, planProgress } from "./planUtils";

const ICON = "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z";

export default function DepartmentPlans() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPlans()
      .then((r) => setPlans(r.data?.data || r.data || []))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, []);

  // Group by department name (objectives_count is present from index).
  const groups = {};
  plans.forEach((p) => {
    const key = p.department?.name || "Unassigned";
    (groups[key] = groups[key] || []).push(p);
  });

  if (loading) return <div className="py-20 text-center"><Spinner /></div>;

  return (
    <div className="px-4 py-5">
      <PageHeader title="All Departments" subtitle="Cross-department view of every plan" icon={ICON} />

      {plans.length === 0 ? (
        <EmptyState icon={ICON} title="No plans to show" description="Plans across departments will be aggregated here." />
      ) : (
        Object.entries(groups).map(([dept, list]) => (
          <Section key={dept} title={dept} subtitle={`${list.length} plan(s)`} icon={ICON}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  <th className="text-left py-2 font-bold">Plan</th>
                  <th className="text-left py-2 font-bold">Type</th>
                  <th className="text-left py-2 font-bold">State</th>
                  <th className="text-left py-2 font-bold">Structure</th>
                  <th className="text-left py-2 font-bold w-32">Progress</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const prog = planProgress(p);
                  return (
                    <tr key={p.id} onClick={() => navigate(`/planning/plans/show/${p.id}`)} className="border-b border-gray-50 hover:bg-gray-50/70 cursor-pointer">
                      <td className="py-2.5"><span className="font-semibold text-gray-800">{p.title}</span><div className="text-[11px] text-gray-400">{p.period_year || "—"}</div></td>
                      <td className="py-2.5 capitalize text-gray-600">{p.type}</td>
                      <td className="py-2.5"><StatusPill status={p.status} /></td>
                      <td className="py-2.5 text-xs text-gray-500">{p.objectives_count ?? 0} obj · {p.items_count ?? 0} items</td>
                      <td className="py-2.5"><ProgressBar value={prog} /><div className="text-[10px] text-gray-400 mt-1">{prog}%</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Section>
        ))
      )}
    </div>
  );
}
