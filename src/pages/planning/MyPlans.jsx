import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { listPlans, deletePlan, PLAN_TYPES, PLAN_STATES } from "../../api/planning";
import { useAuth } from "../../admin/context/AuthContext";
import { PageHeader, StatGrid, EmptyState, Spinner } from "../../components/hr/HrUI";
import { StatusPill, ProgressBar, planProgress } from "./planUtils";
import ListExportActions from "../../components/ListExportActions";

const PLAN_EXPORT_COLS = [
  { key: "title", label: "Plan" },
  { key: "type", label: "Type" },
  { key: "period_year", label: "Year" },
  { key: "status", label: "State" },
  { key: "objectives_count", label: "Objectives" },
  { key: "items_count", label: "Items" },
  { key: "progress", label: "Progress %", exportValue: (p) => (p.progress != null ? p.progress : "") },
];

const ICON = "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2";

export default function MyPlans() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const canCreate = hasPermission("planning.create") || hasPermission("planning.manage");

  // `silent` refreshes (interval / window-focus) skip the spinner so the
  // progress bars update in place without a visible reload.
  const fetchPlans = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await listPlans();
      const data = res.data?.data || res.data || [];
      setPlans(Array.isArray(data) ? data : []);
    } catch {
      if (!silent) setPlans([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    // Keep the live progress fresh while the page is open.
    const id = setInterval(() => fetchPlans(true), 20000);
    const onFocus = () => fetchPlans(true);
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(id); window.removeEventListener("focus", onFocus); };
  }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    const r = await Swal.fire({
      title: "Delete this plan?",
      text: "Objectives, key results and items will be removed. This cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!r.isConfirmed) return;
    try {
      await deletePlan(id);
      setPlans((p) => p.filter((x) => x.id !== id));
      Swal.fire({ icon: "success", title: "Deleted", timer: 1300, showConfirmButton: false });
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Could not delete the plan.", "error");
    }
  };

  const filtered = plans.filter((p) => {
    const q = search.trim().toLowerCase();
    if (q && !`${p.title} ${p.period_year || ""}`.toLowerCase().includes(q)) return false;
    if (filterType && p.type !== filterType) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    return true;
  });

  const stats = [
    { label: "Total plans", value: plans.length, tone: "teal", icon: ICON },
    { label: "Active", value: plans.filter((p) => p.status === "active").length, tone: "emerald", icon: "M5 13l4 4L19 7" },
    { label: "Waiting for approval", value: plans.filter((p) => p.status === "submitted").length, tone: "amber", icon: "M12 8v4l3 3" },
    { label: "Drafts", value: plans.filter((p) => p.status === "draft").length, tone: "blue", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" },
  ];

  return (
    <div className="px-4 py-5">
      <PageHeader
        title="My Plans"
        subtitle="Annual, monthly and weekly plans · all states"
        icon={ICON}
        actions={
          <div className="flex flex-wrap gap-2 items-center">
            <ListExportActions getRows={() => filtered} columns={PLAN_EXPORT_COLS} title="My Plans" />
            {canCreate && (
              <button
                onClick={() => navigate("/planning/plans/create")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-teal-700 text-xs font-bold rounded-xl hover:bg-teal-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                New Plan
              </button>
            )}
          </div>
        }
      />

      <StatGrid stats={stats} />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 mb-4 flex flex-col sm:flex-row gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or period…"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="">All types</option>
          {PLAN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="">All states</option>
          {PLAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="py-16 text-center"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No plans yet"
          description="Create your first plan to set objectives, key results and items that cascade into tasks, events and meetings on approval."
          action={canCreate && (
            <button onClick={() => navigate("/planning/plans/create")} className="mt-4 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700">+ New Plan</button>
          )}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-500">
                <th className="text-left px-4 py-3 font-bold">Plan</th>
                <th className="text-left px-4 py-3 font-bold">Type</th>
                <th className="text-left px-4 py-3 font-bold">State</th>
                <th className="text-left px-4 py-3 font-bold">Structure</th>
                <th className="text-left px-4 py-3 font-bold w-40">Progress</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const prog = planProgress(p);
                return (
                  <tr key={p.id} onClick={() => navigate(`/planning/plans/show/${p.id}`)} className="border-b border-gray-50 hover:bg-gray-50/70 cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-800">{p.title}</div>
                      <div className="text-[11px] text-gray-400">{p.period_year || "—"}</div>
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-600">{p.type}</td>
                    <td className="px-4 py-3"><StatusPill status={p.status} /></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.objectives_count ?? 0} obj · {p.items_count ?? 0} items</td>
                    <td className="px-4 py-3">
                      <ProgressBar value={prog} />
                      <div className="text-[10px] text-gray-400 mt-1">{prog}%</div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/planning/plans/show/${p.id}`); }} className="text-teal-600 hover:text-teal-800 text-xs font-semibold px-2">View</button>
                      {p.status === "draft" && (hasPermission("planning.update") || hasPermission("planning.manage")) && (
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/planning/plans/edit/${p.id}`); }} className="text-blue-600 hover:text-blue-800 text-xs font-semibold px-2">Edit</button>
                      )}
                      {(hasPermission("planning.delete") || hasPermission("planning.manage")) && (
                        <button onClick={(e) => handleDelete(e, p.id)} className="text-red-500 hover:text-red-700 text-xs font-semibold px-2">Delete</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
