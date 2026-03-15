import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get, del } from "../../api/axios";
import Swal from "sweetalert2";

const pipelineStages = [
  { key: "draft", label: "Draft", color: "bg-gray-500", light: "bg-gray-50 text-gray-700 border-gray-200" },
  { key: "submitted", label: "Submitted", color: "bg-blue-500", light: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "approved", label: "Approved", color: "bg-emerald-500", light: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "procurement", label: "Procurement", color: "bg-purple-500", light: "bg-purple-50 text-purple-700 border-purple-200" },
  { key: "delivered", label: "Delivered", color: "bg-cyan-500", light: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  { key: "completed", label: "Completed", color: "bg-teal-500", light: "bg-teal-50 text-teal-700 border-teal-200" },
  { key: "rejected", label: "Rejected", color: "bg-red-500", light: "bg-red-50 text-red-700 border-red-200" },
];

const dummyData = [
  { id: 1, pr_number: "PR-2026-001", title: "Office Stationery for Q1", requested_by: "Ahmad Rahimi", department: "Admin", status: "approved", priority: "medium", total_amount: 15000, items_count: 5, created_at: "2026-01-15" },
  { id: 2, pr_number: "PR-2026-002", title: "Computer Lab Equipment", requested_by: "Khalid Amiri", department: "IT", status: "procurement", priority: "high", total_amount: 250000, items_count: 8, created_at: "2026-01-28" },
  { id: 3, pr_number: "PR-2026-003", title: "Cleaning Supplies - Monthly", requested_by: "Zahra Ahmadi", department: "Facilities", status: "completed", priority: "low", total_amount: 8500, items_count: 12, created_at: "2026-02-01" },
  { id: 4, pr_number: "PR-2026-004", title: "Library Books - Science Section", requested_by: "Maryam Sultani", department: "Library", status: "submitted", priority: "medium", total_amount: 45000, items_count: 20, created_at: "2026-02-10" },
  { id: 5, pr_number: "PR-2026-005", title: "Classroom Furniture Replacement", requested_by: "Mohammad Karimi", department: "Admin", status: "draft", priority: "high", total_amount: 180000, items_count: 15, created_at: "2026-02-20" },
  { id: 6, pr_number: "PR-2026-006", title: "Sports Equipment", requested_by: "Ali Mohammadi", department: "Sports", status: "approved", priority: "medium", total_amount: 35000, items_count: 10, created_at: "2026-02-25" },
  { id: 7, pr_number: "PR-2026-007", title: "Printer Cartridges & Paper", requested_by: "Sara Hashimi", department: "Admin", status: "delivered", priority: "low", total_amount: 12000, items_count: 6, created_at: "2026-03-01" },
  { id: 8, pr_number: "PR-2026-008", title: "Lab Chemicals Restock", requested_by: "Hamid Nazari", department: "Science", status: "rejected", priority: "medium", total_amount: 28000, items_count: 8, created_at: "2026-03-05" },
  { id: 9, pr_number: "PR-2026-009", title: "Security Camera System", requested_by: "Khalid Amiri", department: "IT", status: "submitted", priority: "urgent", total_amount: 95000, items_count: 4, created_at: "2026-03-08" },
  { id: 10, pr_number: "PR-2026-010", title: "Teacher Desk Accessories", requested_by: "Fatima Noori", department: "HR", status: "draft", priority: "low", total_amount: 5500, items_count: 7, created_at: "2026-03-12" },
];

const statusBadge = (val) => {
  const stage = pipelineStages.find((s) => s.key === val);
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${stage?.light || "bg-gray-100 text-gray-700 border-gray-200"}`}>
      {val?.replace(/_/g, " ")}
    </span>
  );
};

const priorityBadge = (val) => {
  const colors = {
    low: "bg-blue-50 text-blue-700 border-blue-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    high: "bg-orange-50 text-orange-700 border-orange-200",
    urgent: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${colors[val] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
      {val}
    </span>
  );
};

export default function PurchaseRequests() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await get("/purchase/purchase-requests");
      const data = response.data?.data || response.data || [];
      const arr = Array.isArray(data) ? data : [];
      setItems(arr);
      setFilteredItems(arr);
    } catch {
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
    if (status !== "all") result = result.filter((i) => i.status === status);
    if (query) {
      result = result.filter((i) =>
        ["pr_number", "title", "requested_by", "department"].some((f) =>
          String(i[f] || "").toLowerCase().includes(query)
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
      try { await del(`/purchase/purchase-requests/${id}`); } catch { /* demo */ }
      setItems((prev) => prev.filter((i) => i.id !== id));
      setFilteredItems((prev) => prev.filter((i) => i.id !== id));
      Swal.fire("Deleted!", "Purchase request has been deleted.", "success");
    }
  };

  const getStageCount = (status) => items.filter((i) => i.status === status).length;
  const totalAmount = items.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);

  return (
    <div className="px-4 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Purchase Requests</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage procurement requests through the approval pipeline</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input type="text" value={searchQuery} onChange={handleSearch} placeholder="Search requests..."
              className="w-full sm:w-64 pl-10 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <button onClick={() => navigate("/purchase/purchase-requests/create")}
            className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-1.5 font-medium text-xs">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Request
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-4 mb-4 text-white">
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-teal-200">Total Requests</p>
            <p className="text-2xl font-bold">{items.length}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-teal-200">Total Amount</p>
            <p className="text-2xl font-bold">{totalAmount.toLocaleString()} <span className="text-sm font-normal">AFN</span></p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-teal-200">Pending Approval</p>
            <p className="text-2xl font-bold">{getStageCount("submitted")}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-teal-200">In Procurement</p>
            <p className="text-2xl font-bold">{getStageCount("procurement")}</p>
          </div>
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
            <table className="w-full min-w-[800px]">
              <thead className="bg-teal-50">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">PR #</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Title</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Requested By</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Department</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Priority</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Amount</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Date</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/purchase/purchase-requests/show/${item.id}`)}>
                    <td className="px-3 py-2.5 text-xs font-medium text-teal-600">{item.pr_number}</td>
                    <td className="px-3 py-2.5">
                      <div className="text-xs font-medium text-gray-800">{item.title}</div>
                      <div className="text-[10px] text-gray-400">{item.items_count} items</div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-600">{item.requested_by}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-600">{item.department}</td>
                    <td className="px-3 py-2.5">{priorityBadge(item.priority)}</td>
                    <td className="px-3 py-2.5 text-xs font-medium text-gray-800">{Number(item.total_amount).toLocaleString()} AFN</td>
                    <td className="px-3 py-2.5">{statusBadge(item.status)}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">{item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}</td>
                    <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/purchase/purchase-requests/show/${item.id}`)} className="p-1 text-teal-600 hover:bg-teal-50 rounded" title="View">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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
              <p className="text-gray-500 text-xs">No purchase requests found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
