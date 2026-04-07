import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { get, del } from "../../api/axios";
import Swal from "sweetalert2";

const pipelineStages = [
  { key: "received", label: "Received", color: "bg-blue-500", light: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "screening", label: "Screening", color: "bg-amber-500", light: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "shortlisted", label: "Shortlisted", color: "bg-purple-500", light: "bg-purple-50 text-purple-700 border-purple-200" },
  { key: "interview", label: "Interview", color: "bg-cyan-500", light: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  { key: "offer", label: "Offer", color: "bg-indigo-500", light: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { key: "hired", label: "Hired", color: "bg-emerald-500", light: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "waiting_list", label: "Waiting List", color: "bg-orange-500", light: "bg-orange-50 text-orange-700 border-orange-200" },
  { key: "rejected", label: "Rejected", color: "bg-red-500", light: "bg-red-50 text-red-700 border-red-200" },
  { key: "withdrawn", label: "Withdrawn", color: "bg-gray-500", light: "bg-gray-50 text-gray-700 border-gray-200" },
];

const statusBadge = (val) => {
  const stage = pipelineStages.find((s) => s.key === val);
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${stage?.light || "bg-gray-100 text-gray-700 border-gray-200"}`}>
      {val?.replace(/_/g, " ")}
    </span>
  );
};

export default function Applications() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });
  const [stageCounts, setStageCounts] = useState({});

  const fetchItems = useCallback(async (page = 1, status = activeFilter, search = searchQuery) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page);
      if (status !== "all") params.append("status", status);
      if (search) params.append("search", search);

      const response = await get(`/recruitment/applications?${params.toString()}`);
      const data = response.data?.data || [];
      setItems(Array.isArray(data) ? data : []);
      if (response.data?.meta) setMeta(response.data.meta);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, searchQuery]);

  const fetchCounts = async () => {
    try {
      const response = await get("/recruitment/applications?per_page=9999");
      const all = response.data?.data || [];
      const counts = {};
      pipelineStages.forEach((s) => { counts[s.key] = 0; });
      all.forEach((item) => { if (counts[item.status] !== undefined) counts[item.status]++; });
      setStageCounts(counts);
    } catch {
      setStageCounts({});
    }
  };

  useEffect(() => {
    fetchItems(1, "all", "");
    fetchCounts();
  }, []);

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems(1, activeFilter, searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleFilter = (status) => {
    const newFilter = activeFilter === status ? "all" : status;
    setActiveFilter(newFilter);
    fetchItems(1, newFilter, searchQuery);
  };

  const handlePageChange = (page) => {
    fetchItems(page, activeFilter, searchQuery);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?", text: "You will not be able to recover this record!",
      icon: "warning", showCancelButton: true, confirmButtonColor: "#0d9488", cancelButtonColor: "#ef4444", confirmButtonText: "Yes, delete it!",
    });
    if (result.isConfirmed) {
      try { await del(`/recruitment/applications/${id}`); } catch { /* */ }
      fetchItems(meta.current_page, activeFilter, searchQuery);
      fetchCounts();
      Swal.fire("Deleted!", "Application has been deleted.", "success");
    }
  };

  return (
    <div className="px-4 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Applications</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage candidates through the hiring pipeline</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input type="text" value={searchQuery} onChange={handleSearch} placeholder="Search candidates..."
              className="w-full sm:w-64 pl-10 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <button onClick={() => navigate("/recruitment/applications/create")}
            className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-1.5 font-medium text-xs">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Application
          </button>
        </div>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2 mb-5">
        {pipelineStages.map((stage) => {
          const count = stageCounts[stage.key] || 0;
          const isActive = activeFilter === stage.key;
          return (
            <button key={stage.key} onClick={() => handleFilter(stage.key)}
              className={`relative p-3 rounded-xl border-2 transition-all text-left ${
                isActive ? `${stage.light} border-current ring-2 ring-current/20` : "bg-white border-gray-100 hover:border-gray-200"
              }`}>
              <div className={`w-2 h-2 rounded-full ${stage.color} mb-2`} />
              <p className="text-lg font-bold text-gray-800">{count}</p>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{stage.label}</p>
            </button>
          );
        })}
      </div>

      {/* Active Filter */}
      {activeFilter !== "all" && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-gray-500">Filtering by: <strong className="capitalize">{activeFilter.replace(/_/g, " ")}</strong></span>
          <button onClick={() => handleFilter(activeFilter)} className="text-xs text-teal-600 hover:text-teal-700 font-medium">Clear filter</button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent"></div>
          <p className="mt-2 text-gray-500 text-xs">Loading...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-teal-50">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Applicant</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Job Posting</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Contact</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Source</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Applied</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/recruitment/applications/show/${item.id}`)}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-[10px] flex-shrink-0">
                          {item.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-gray-800">{item.full_name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-600">{item.job_posting?.title || "-"}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-600">{item.contact_number}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-600 capitalize">{item.source?.replace(/_/g, " ")}</td>
                    <td className="px-3 py-2.5 text-xs">{statusBadge(item.status)}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">{item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}</td>
                    <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/recruitment/applications/show/${item.id}`)} className="p-1 text-teal-600 hover:bg-teal-50 rounded" title="View & Manage">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button onClick={() => navigate(`/recruitment/applications/edit/${item.id}`)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 text-xs">No applications found</p>
            </div>
          )}

          {/* Pagination */}
          {meta.last_page > 1 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Showing {(meta.current_page - 1) * meta.per_page + 1}-{Math.min(meta.current_page * meta.per_page, meta.total)} of {meta.total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(meta.current_page - 1)}
                  disabled={meta.current_page <= 1}
                  className="px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: meta.last_page }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === meta.last_page || Math.abs(p - meta.current_page) <= 1)
                  .reduce((acc, p, i, arr) => {
                    if (i > 0 && p - arr[i - 1] > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span key={`dots-${i}`} className="px-1.5 text-xs text-gray-400">...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => handlePageChange(p)}
                        className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${
                          p === meta.current_page
                            ? "bg-teal-600 text-white"
                            : "text-gray-600 bg-white border border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => handlePageChange(meta.current_page + 1)}
                  disabled={meta.current_page >= meta.last_page}
                  className="px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
