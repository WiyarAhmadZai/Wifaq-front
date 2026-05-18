import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { listPurchaseRequests, deletePurchaseRequest } from "../../api/purchaseRequests";
import Swal from "sweetalert2";

// Status palette — mirrors the backend enum on purchase_requests.status.
const STATUS = {
  draft:       { label: "Draft",       cls: "bg-gray-50 text-gray-700 border-gray-200" },
  pending:     { label: "Pending",     cls: "bg-amber-50 text-amber-700 border-amber-200" },
  approved:    { label: "Approved",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected:    { label: "Rejected",    cls: "bg-red-50 text-red-700 border-red-200" },
  procurement: { label: "Procuring",   cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  completed:   { label: "Completed",   cls: "bg-teal-50 text-teal-700 border-teal-200" },
  cancelled:   { label: "Cancelled",   cls: "bg-gray-100 text-gray-500 border-gray-200" },
};

const PRIORITY = {
  low:    "bg-blue-50 text-blue-700 border-blue-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high:   "bg-red-50 text-red-700 border-red-200",
};

const FILTER_TABS = ["all", "draft", "pending", "approved", "procurement", "completed"];

const fmt = (n) => Number(n || 0).toLocaleString();

export default function PurchaseRequests() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => { fetchItems(); /* eslint-disable-next-line */ }, [filter]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = { per_page: 100 };
      if (filter !== "all") params.status = filter;
      if (search) params.search = search;
      const response = await listPurchaseRequests(params);
      // Backend returns a Laravel paginator → rows in response.data.data
      const rows = response.data?.data?.data || response.data?.data || [];
      setItems(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error("Failed to load purchase requests", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const onSearch = (e) => setSearch(e.target.value);
  const onSearchSubmit = (e) => { e.preventDefault(); fetchItems(); };

  const handleDelete = async (id) => {
    const r = await Swal.fire({
      title: "Delete request?",
      text: "Only drafts can be deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Delete",
    });
    if (!r.isConfirmed) return;
    try {
      await deletePurchaseRequest(id);
      setItems((p) => p.filter((i) => i.id !== id));
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to delete", "error");
    }
  };

  const stats = useMemo(() => {
    const s = { total: items.length, pending: 0, procurement: 0, completed: 0, value: 0 };
    items.forEach((i) => {
      if (s[i.status] !== undefined) s[i.status]++;
      s.value += Number(i.estimated_total) || 0;
    });
    return s;
  }, [items]);

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Purchase Requests</h2>
          <p className="text-xs text-gray-500">Submit, approve, procure, and close out purchase requests.</p>
        </div>
        <button onClick={() => navigate("/purchase/purchase-requests/create")}
          className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Request
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <SummaryCard label="Total" value={stats.total} accent="from-teal-600 to-teal-700" />
        <SummaryCard label="Pending approval" value={stats.pending} accent="from-amber-500 to-amber-600" />
        <SummaryCard label="In procurement" value={stats.procurement} accent="from-indigo-500 to-indigo-600" />
        <SummaryCard label="Total value (AFN)" value={fmt(stats.value)} accent="from-gray-700 to-gray-800" />
      </div>

      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_TABS.map((t) => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold capitalize transition-colors ${
                filter === t ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {t}
            </button>
          ))}
        </div>
        <form onSubmit={onSearchSubmit} className="flex-1">
          <input type="text" value={search} onChange={onSearch}
            onBlur={fetchItems}
            placeholder="Search by PR number or purpose…"
            className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
        </form>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-[11px]">
          <thead className="bg-gray-50 text-gray-500 uppercase text-[9px]">
            <tr>
              <th className="text-left px-3 py-2">PR #</th>
              <th className="text-left px-3 py-2">Purpose</th>
              <th className="text-left px-3 py-2">Requester</th>
              <th className="text-center px-3 py-2">Priority</th>
              <th className="text-right px-3 py-2">Items</th>
              <th className="text-right px-3 py-2">Total (AFN)</th>
              <th className="text-center px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Date</th>
              <th className="text-center px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={9} className="text-center py-8 text-xs text-gray-400">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-8 text-xs text-gray-400 italic">No purchase requests yet.</td></tr>
            ) : items.map((pr) => {
              const st = STATUS[pr.status] || STATUS.draft;
              return (
                <tr key={pr.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/purchase/purchase-requests/show/${pr.id}`)}>
                  <td className="px-3 py-2 font-mono text-[10px] text-gray-700">{pr.request_number}</td>
                  <td className="px-3 py-2 text-gray-800 max-w-[220px] truncate">{pr.purpose}</td>
                  <td className="px-3 py-2 text-gray-600">{pr.requester?.name || "—"}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${PRIORITY[pr.priority] || ""}`}>
                      {pr.priority}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">{pr.items?.length ?? 0}</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-800">{fmt(pr.estimated_total)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${st.cls}`}>{st.label}</span>
                  </td>
                  <td className="px-3 py-2 text-gray-500">{pr.request_date}</td>
                  <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                    {pr.status === "draft" && (
                      <button onClick={() => handleDelete(pr.id)}
                        className="text-[10px] text-red-600 hover:text-red-700">Delete</button>
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

function SummaryCard({ label, value, accent }) {
  return (
    <div className={`bg-gradient-to-r ${accent} rounded-xl p-3 text-white`}>
      <p className="text-[10px] uppercase tracking-wider opacity-80">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
