import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const DEMO = [
  { id: 1, date: "2026-03-10", branch: "Wifaq School", category: "Office Supplies", urgency: "high", item: "Printer Cartridges (HP 26A)", quantity: 10, reason: "Stock depleted, needed for admin printing", estimated_cost: 25000, notes: "Prefer original HP", status: "pending" },
  { id: 2, date: "2026-03-08", branch: "Wifaq Learning Studio", category: "IT Equipment", urgency: "medium", item: "Wireless Mouse & Keyboard Sets", quantity: 15, reason: "Lab upgrade for computer class", estimated_cost: 18000, notes: "", status: "approved" },
  { id: 3, date: "2026-03-05", branch: "WISAL Academy", category: "Furniture", urgency: "low", item: "Student Desks (Wooden)", quantity: 20, reason: "New classroom setup for Grade 7", estimated_cost: 60000, notes: "Standard size, with storage shelf", status: "approved" },
  { id: 4, date: "2026-03-03", branch: "Wifaq School", category: "Cleaning", urgency: "medium", item: "Cleaning Supplies Bundle", quantity: 5, reason: "Monthly restocking", estimated_cost: 8000, notes: "Detergent, mop heads, trash bags", status: "pending" },
  { id: 5, date: "2026-03-01", branch: "Wifaq Learning Studio", category: "Books", urgency: "high", item: "Science Textbooks Grade 9", quantity: 30, reason: "New semester starting, insufficient copies", estimated_cost: 45000, notes: "Dari language edition", status: "rejected" },
];

const urgencyStyle = { high: "bg-red-50 text-red-700", medium: "bg-yellow-50 text-yellow-700", low: "bg-teal-50 text-teal-700" };
const urgencyDot = { high: "bg-red-500", medium: "bg-yellow-500", low: "bg-teal-500" };
const statusStyle = { pending: "bg-yellow-50 text-yellow-700", approved: "bg-teal-50 text-teal-700", rejected: "bg-red-50 text-red-700" };
const statusDot = { pending: "bg-yellow-500", approved: "bg-teal-500", rejected: "bg-red-500" };
const categoryIcon = { "Office Supplies": "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", "IT Equipment": "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", "Furniture": "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4", "Cleaning": "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z", "Books": "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" };
const defaultIcon = "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4";

export default function PurchaseRequest() {
  const navigate = useNavigate();
  const [items, setItems] = useState(DEMO);
  const [search, setSearch] = useState("");
  const [filterUrgency, setFilterUrgency] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  const activeFilters = [filterUrgency, filterStatus].filter(Boolean).length;

  const filtered = items.filter(it => {
    const q = search.toLowerCase();
    if (q && !it.item.toLowerCase().includes(q) && !it.branch.toLowerCase().includes(q) && !it.category.toLowerCase().includes(q)) return false;
    if (filterUrgency && it.urgency !== filterUrgency) return false;
    if (filterStatus && it.status !== filterStatus) return false;
    return true;
  });

  const stats = [
    { label: "Total Requests", value: items.length, icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
    { label: "Pending", value: items.filter(r => r.status === "pending").length, icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "Approved", value: items.filter(r => r.status === "approved").length, icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "Est. Total Cost", value: `${items.reduce((s, r) => s + (r.estimated_cost || 0), 0).toLocaleString()} AFN`, icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  ];

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    const res = await Swal.fire({ title: "Delete this request?", text: "This action cannot be undone.", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", cancelButtonColor: "#6b7280", confirmButtonText: "Delete" });
    if (res.isConfirmed) {
      setItems(prev => prev.filter(i => i.id !== id));
      Swal.fire({ icon: "success", title: "Deleted", timer: 1500, showConfirmButton: false });
    }
  };

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Purchase Requests</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage purchase requests across all branches</p>
        </div>
        <button onClick={() => navigate("/hr/purchase-request/create")}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Request
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div key={s.label} className={`flex items-center gap-3 p-4 rounded-2xl border ${i === 0 ? "bg-teal-600 border-teal-600" : "bg-white border-teal-100"}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${i === 0 ? "bg-white/20" : "bg-teal-50"}`}>
              <svg className={`w-4 h-4 ${i === 0 ? "text-white" : "text-teal-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} /></svg>
            </div>
            <div>
              <p className={`text-[10px] font-medium ${i === 0 ? "text-teal-100" : "text-gray-500"}`}>{s.label}</p>
              <p className={`text-xl font-bold leading-tight ${i === 0 ? "text-white" : "text-gray-800"}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filter bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by item, branch, or category..."
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white" />
          </div>
          <button onClick={() => setFilterOpen(!filterOpen)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${filterOpen || activeFilters ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-600 border-gray-200 hover:border-teal-300"}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            Filters
            {activeFilters > 0 && <span className="w-4.5 h-4.5 rounded-full bg-white text-teal-700 text-[10px] font-bold flex items-center justify-center">{activeFilters}</span>}
          </button>
          {(activeFilters > 0 || search) && (
            <button onClick={() => { setSearch(""); setFilterUrgency(""); setFilterStatus(""); }}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
              Clear
            </button>
          )}
        </div>

        {filterOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-gray-100">
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Urgency</label>
              <select value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 bg-white">
                <option value="">All Urgency</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 bg-white">
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Branch</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Qty</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Est. Cost</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Urgency</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(item => (
                <tr key={item.id} onClick={() => navigate(`/hr/purchase-request/show/${item.id}`)}
                  className="hover:bg-gray-50/80 cursor-pointer group transition-colors">
                  {/* Item */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={categoryIcon[item.category] || defaultIcon} />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 group-hover:text-teal-700 transition-colors">{item.item}</p>
                        <p className="text-[11px] text-gray-400">{item.category}</p>
                      </div>
                    </div>
                  </td>
                  {/* Branch */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {item.branch.charAt(0)}
                      </div>
                      <span className="text-sm text-gray-700">{item.branch}</span>
                    </div>
                  </td>
                  {/* Date */}
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-700">{item.date}</p>
                  </td>
                  {/* Qty */}
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-semibold text-gray-800">{item.quantity}</span>
                  </td>
                  {/* Cost */}
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold text-gray-800">{item.estimated_cost?.toLocaleString()}</span>
                    <span className="text-[11px] text-gray-400 ml-1">AFN</span>
                  </td>
                  {/* Urgency */}
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${urgencyStyle[item.urgency]}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${urgencyDot[item.urgency]}`} />
                      {item.urgency.charAt(0).toUpperCase() + item.urgency.slice(1)}
                    </span>
                  </td>
                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusStyle[item.status]}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusDot[item.status]}`} />
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => navigate(`/hr/purchase-request/show/${item.id}`)}
                        className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="View">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                      <button onClick={() => navigate(`/hr/purchase-request/edit/${item.id}`)}
                        className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Edit">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={e => handleDelete(e, item.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 px-4">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="text-sm font-medium text-gray-600">No purchase requests found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
            <button onClick={() => navigate("/hr/purchase-request/create")}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Create First Request
            </button>
          </div>
        )}

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">Showing {filtered.length} of {items.length} requests</p>
            <div className="flex items-center gap-1">
              {[...new Set(items.map(d => d.branch))].map(b => (
                <span key={b} className="px-2 py-0.5 bg-white border border-gray-200 text-[10px] text-gray-500 rounded-lg">{b}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
