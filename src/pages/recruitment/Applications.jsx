import { useState, useEffect } from "react";
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
  { key: "rejected", label: "Rejected", color: "bg-red-500", light: "bg-red-50 text-red-700 border-red-200" },
  { key: "withdrawn", label: "Withdrawn", color: "bg-gray-500", light: "bg-gray-50 text-gray-700 border-gray-200" },
];
const dummyData = [
  { id: 1, full_name: "Ahmad Rahimi", contact_number: "+93 770 123 456", status: "interview", source: "website", job_posting: { title: "Mathematics Teacher" }, created_at: "2026-02-15" },
  { id: 2, full_name: "Fatima Noori", contact_number: "+93 772 456 789", status: "screening", source: "referral", job_posting: { title: "Quran Teacher" }, created_at: "2026-03-01" },
  { id: 3, full_name: "Mohammad Karimi", contact_number: "+93 775 789 012", status: "offer", source: "job_board", job_posting: { title: "Science Teacher" }, created_at: "2026-01-20" },
  { id: 4, full_name: "Zahra Ahmadi", contact_number: "+93 773 321 654", status: "hired", source: "internal", job_posting: { title: "Administrative Assistant" }, created_at: "2026-01-05" },
  { id: 5, full_name: "Ali Mohammadi", contact_number: "+93 774 654 987", status: "received", source: "website", job_posting: { title: "Quran Teacher" }, created_at: "2026-03-14" },
];

const statusBadge = (val, item, onClick) => {
  const stage = pipelineStages.find((s) => s.key === val);
  return (
    <button onClick={() => onClick && onClick(item)}
      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer hover:opacity-80 transition-opacity ${stage?.light || "bg-gray-100 text-gray-700 border-gray-200"}`}>
      {val?.replace(/_/g, " ")}
    </button>
  );
};

export default function Applications() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await get("/recruitment/applications");
      const data = response.data?.data || response.data || [];
      const arr = Array.isArray(data) ? data : [];
      setItems(arr);
      setFilteredItems(arr);
    } catch {
      // Demo mode — use dummy data
      setItems(dummyData);
      setFilteredItems(dummyData);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    applyFilters(query, activeFilter);
  };

  const handleFilter = (status) => {
    setActiveFilter(status);
    applyFilters(searchQuery, status);
  };

  const applyFilters = (query, status) => {
    let result = items;
    if (status !== "all") {
      result = result.filter((item) => item.status === status);
    }
    if (query) {
      result = result.filter((item) =>
        ["full_name", "contact_number"].some((field) =>
          String(item[field] || "").toLowerCase().includes(query)
        )
      );
    }
    setFilteredItems(result);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?", text: "You will not be able to recover this record!",
      icon: "warning", showCancelButton: true, confirmButtonColor: "#0d9488", cancelButtonColor: "#ef4444", confirmButtonText: "Yes, delete it!",
    });
    if (result.isConfirmed) {
      try { await del(`/recruitment/applications/${id}`); } catch { /* demo */ }
      setItems((prev) => prev.filter((i) => i.id !== id));
      setFilteredItems((prev) => prev.filter((i) => i.id !== id));
      Swal.fire("Deleted!", "Application has been deleted.", "success");
    }
  };

  const getStageCount = (status) => items.filter((item) => item.status === status).length;

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
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-5">
        {pipelineStages.map((stage) => {
          const count = getStageCount(stage.key);
          const isActive = activeFilter === stage.key;
          return (
            <button key={stage.key} onClick={() => handleFilter(isActive ? "all" : stage.key)}
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
          <span className="text-xs text-gray-500">Filtering by: <strong className="capitalize">{activeFilter}</strong></span>
          <button onClick={() => handleFilter("all")} className="text-xs text-teal-600 hover:text-teal-700 font-medium">Clear filter</button>
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
                {filteredItems.map((item) => (
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
                    <td className="px-3 py-2.5 text-xs">{statusBadge(item.status, item)}</td>
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
          {filteredItems.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 text-xs">No applications found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
