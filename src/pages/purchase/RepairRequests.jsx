import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteRepairRequest, listRepairRequests } from "../../api/repairRequests";
import Swal from "sweetalert2";

import { fmtDate } from "../../utils/formErrors";
const fmt = (n) => Number(n || 0).toLocaleString();

const STATUS = {
  pending:       { label: "Pending",     cls: "bg-amber-50 text-amber-700 border-amber-200" },
  approved:      { label: "Approved",    cls: "bg-blue-50 text-blue-700 border-blue-200" },
  rejected:      { label: "Rejected",    cls: "bg-red-50 text-red-700 border-red-200" },
  repairing:     { label: "Repairing",   cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  cannot_repair: { label: "Unrepairable",cls: "bg-red-50 text-red-700 border-red-200" },
  completed:     { label: "Completed",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled:     { label: "Cancelled",   cls: "bg-gray-100 text-gray-500 border-gray-200" },
};

const FILTERS = ["all", "pending", "approved", "repairing", "completed"];

export default function RepairRequests() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => { fetchItems(); /* eslint-disable-next-line */ }, [filter]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = { per_page: 100 };
      if (filter !== "all") params.status = filter;
      if (search) params.search = search;
      const r = await listRepairRequests(params);
      const rows = r.data?.data?.data || r.data?.data || [];
      setItems(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const r = await Swal.fire({
      title: "Delete repair request?",
      icon: "warning", showCancelButton: true,
      confirmButtonColor: "#ef4444", confirmButtonText: "Delete",
    });
    if (!r.isConfirmed) return;
    try {
      await deleteRepairRequest(id);
      setItems((p) => p.filter((i) => i.id !== id));
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to delete", "error");
    }
  };

  const stats = useMemo(() => {
    const s = { total: items.length, pending: 0, repairing: 0, cost: 0 };
    items.forEach((i) => {
      if (i.status === "pending") s.pending++;
      if (i.status === "repairing") s.repairing++;
      s.cost += Number(i.actual_cost) || 0;
    });
    return s;
  }, [items]);

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Repair Requests</h2>
          <p className="text-xs text-gray-500">Report broken items → approve → repair → close. If unrepairable, a replacement purchase is raised automatically.</p>
        </div>
        <button onClick={() => navigate("/purchase/repair-requests/create")}
          className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Report broken item
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <Card label="Total" value={stats.total} accent="from-teal-600 to-teal-700" />
        <Card label="Awaiting approval" value={stats.pending} accent={stats.pending ? "from-amber-500 to-amber-600" : "from-gray-500 to-gray-600"} />
        <Card label="In repair" value={stats.repairing} accent="from-indigo-500 to-indigo-600" />
        <Card label="Repair spend (AFN)" value={fmt(stats.cost)} accent="from-gray-700 to-gray-800" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((t) => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold capitalize transition-colors ${
                filter === t ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>{t}</button>
          ))}
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} onBlur={fetchItems}
          placeholder="Search by RR number or item…"
          className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-[11px]">
          <thead className="bg-gray-50 text-gray-500 uppercase text-[9px]">
            <tr>
              <th className="text-left px-3 py-2">RR #</th>
              <th className="text-left px-3 py-2">Item</th>
              <th className="text-left px-3 py-2">Issue</th>
              <th className="text-right px-3 py-2">Est. cost</th>
              <th className="text-right px-3 py-2">Actual cost</th>
              <th className="text-center px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Reported</th>
              <th className="text-center px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8 text-xs text-gray-400">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-xs text-gray-400 italic">No repair requests.</td></tr>
            ) : items.map((rr) => {
              const st = STATUS[rr.status] || STATUS.pending;
              return (
                <tr key={rr.id} className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/purchase/repair-requests/show/${rr.id}`)}>
                  <td className="px-3 py-2 font-mono text-[10px] text-gray-700">{rr.request_number}</td>
                  <td className="px-3 py-2 font-medium text-gray-800">{rr.item_name}<span className="text-[10px] text-gray-400 ml-1">×{fmt(rr.quantity)}</span></td>
                  <td className="px-3 py-2 text-gray-500 max-w-[220px] truncate">{rr.issue_description}</td>
                  <td className="px-3 py-2 text-right text-gray-600 font-mono">{rr.estimated_cost ? fmt(rr.estimated_cost) : "—"}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-gray-800">{rr.actual_cost ? fmt(rr.actual_cost) : "—"}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${st.cls}`}>{st.label}</span>
                    {rr.generated_purchase_request && (
                      <span className="block text-[9px] text-indigo-600 mt-0.5">↳ {rr.generated_purchase_request.request_number}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-500">{fmtDate(rr.reported_date)}</td>
                  <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                    {["pending", "cancelled", "rejected"].includes(rr.status) && (
                      <button onClick={() => handleDelete(rr.id)} className="text-[10px] text-red-600 hover:text-red-800">Delete</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ label, value, accent }) {
  return (
    <div className={`bg-gradient-to-r ${accent} rounded-xl p-3 text-white`}>
      <p className="text-[10px] uppercase tracking-wider opacity-80">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
