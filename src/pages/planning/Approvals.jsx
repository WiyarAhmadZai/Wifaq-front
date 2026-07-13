import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listAwaitingApproval } from "../../api/planning";
import { peekCache } from "../../api/axios";
import { PageHeader, EmptyState, Spinner, InfoNote } from "../../components/hr/HrUI";
import { fmtDate } from "../../utils/formErrors";
import { StatusPill } from "./planUtils";

const ICON = "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z";

export default function Approvals() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const __cached = peekCache("/planning/plans", { awaiting_approval: 1 });
    if (__cached) { setPlans(__cached?.data || __cached || []); setLoading(false); }
    listAwaitingApproval()
      .then((r) => setPlans(r.data?.data || r.data || []))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-4 py-5">
      <PageHeader title="Approval Review" subtitle="Plans submitted and awaiting your decision" icon={ICON} />

      <InfoNote tone="teal" title="Mashwara reminder">
        Discussion on each plan is logged as a decision record. Approving runs the cascade —
        plan items become real <b>Tasks, Events and Budget/Meetings</b> in one transaction.
      </InfoNote>

      {loading ? (
        <div className="py-16 text-center"><Spinner /></div>
      ) : plans.length === 0 ? (
        <EmptyState icon={ICON} title="Nothing awaiting approval" description="Submitted plans will appear here for review." />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-500">
                <th className="text-left px-4 py-3 font-bold">Plan</th>
                <th className="text-left px-4 py-3 font-bold">Type</th>
                <th className="text-left px-4 py-3 font-bold">Owner</th>
                <th className="text-left px-4 py-3 font-bold">Submitted</th>
                <th className="text-left px-4 py-3 font-bold">State</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id} onClick={() => navigate(`/planning/plans/show/${p.id}`)} className="border-b border-gray-50 hover:bg-gray-50/70 cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-800">{p.title}</div>
                    <div className="text-[11px] text-gray-400">{p.period_year || "—"}</div>
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-600">{p.type}</td>
                  <td className="px-4 py-3 text-gray-600">{p.owner?.name || "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.submitted_at ? fmtDate(p.submitted_at) : "—"}</td>
                  <td className="px-4 py-3"><StatusPill status={p.status} /></td>
                  <td className="px-4 py-3 text-right"><button className="text-teal-600 hover:text-teal-800 text-xs font-bold">Review →</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
