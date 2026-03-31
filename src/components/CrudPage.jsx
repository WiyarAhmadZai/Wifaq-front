import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get, del, put } from "../api/axios";
import Swal from "sweetalert2";

export default function CrudPage({
  title,
  apiEndpoint,
  deleteEndpoint = null,
  listColumns,
  createRoute,
  editRoute,
  showRoute,
  idField = "id",
  extraHeaderButtons = null,
  searchable = false,
  searchFields = [],
  statusEndpoint = null,
  statusField = "status",
  statusOptions = [],
  statusSuffix = "",
}) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await get(apiEndpoint);
      const data = response.data?.data || response.data || [];
      setItems(Array.isArray(data) ? data : []);
      setFilteredItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch error:", error);
      let errorMessage = "An unexpected error occurred";
      let errorTitle = "Error";
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        if (status === 500) { errorTitle = "Server Error (500)"; errorMessage = data?.message || "Internal server error."; }
        else if (status === 401) { errorTitle = "Unauthorized (401)"; errorMessage = "Please login to access this resource."; }
        else if (status === 403) { errorTitle = "Forbidden (403)"; errorMessage = "You do not have permission."; }
        else if (status === 404) { errorTitle = "Not Found (404)"; errorMessage = "Resource not found."; }
        else if (status === 422) { errorTitle = "Validation Error (422)"; errorMessage = data?.message || "Validation failed."; }
        else { errorTitle = `Error (${status})`; errorMessage = data?.message || `HTTP ${status} error`; }
      } else if (error.request) { errorTitle = "Network Error"; errorMessage = "Cannot connect to server."; }
      Swal.fire({ title: errorTitle, text: errorMessage, icon: "error", confirmButtonColor: "#0d9488" });
      setItems([]); setFilteredItems([]);
    } finally { setLoading(false); }
  };

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    if (!query) { setFilteredItems(items); return; }
    const fieldsToSearch = searchFields.length > 0 ? searchFields : listColumns.map(col => col.key);
    setFilteredItems(items.filter(item => fieldsToSearch.some(field => {
      const value = item[field];
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(query);
    })));
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({ title: "Delete this record?", text: "This action cannot be undone.", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", cancelButtonColor: "#6b7280", confirmButtonText: "Delete" });
    if (result.isConfirmed) {
      try {
        await del(`${deleteEndpoint ?? apiEndpoint}/${id}`);
        Swal.fire({ icon: "success", title: "Deleted", timer: 1500, showConfirmButton: false });
        fetchItems();
      } catch { Swal.fire("Error", "Failed to delete record.", "error"); }
    }
  };

  const handleOpenStatusModal = (item) => { setSelectedItem(item); setNewStatus(item[statusField] || ""); setShowStatusModal(true); };
  const handleCloseStatusModal = () => { setShowStatusModal(false); setSelectedItem(null); setNewStatus(""); };
  const handleStatusUpdate = async () => {
    if (!newStatus) { Swal.fire("Error", "Please select a status", "error"); return; }
    setSavingStatus(true);
    try {
      await put(`${statusEndpoint}/${selectedItem[idField]}${statusSuffix}`, { [statusField]: newStatus });
      Swal.fire({ icon: "success", title: "Status updated", timer: 1500, showConfirmButton: false });
      handleCloseStatusModal(); fetchItems();
    } catch (error) { Swal.fire("Error", error.response?.data?.message || "Failed to update status", "error"); }
    finally { setSavingStatus(false); }
  };

  const stats = [
    { label: `Total ${title}`, value: items.length, icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  ];

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">{title}</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage {title.toLowerCase()} records</p>
        </div>
        <div className="flex gap-2">
          {extraHeaderButtons}
          <button onClick={() => navigate(createRoute)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Entry
          </button>
        </div>
      </div>

      {/* Stats and Search Row */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Stat card */}
        <div className="flex-shrink-0">
          {stats.map((s, i) => (
            <div key={s.label} className={`flex items-center gap-3 px-5 py-4 rounded-2xl border ${i === 0 ? "bg-teal-600 border-teal-600" : "bg-white border-teal-100"}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${i === 0 ? "bg-white/20" : "bg-teal-50"}`}>
                <svg className={`w-5 h-5 ${i === 0 ? "text-white" : "text-teal-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} /></svg>
              </div>
              <div>
                <p className={`text-[10px] font-medium ${i === 0 ? "text-teal-100" : "text-gray-500"}`}>{s.label}</p>
                <p className={`text-2xl font-bold leading-tight ${i === 0 ? "text-white" : "text-gray-800"}`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input value={searchQuery} onChange={handleSearch}
                placeholder={`Search ${title.toLowerCase()}...`}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white" />
            </div>
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setFilteredItems(items); }}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent" />
          <p className="mt-2 text-gray-400 text-xs">Loading...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">#</th>
                  {listColumns.map(col => (
                    <th key={col.key} className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">{col.label}</th>
                  ))}
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredItems.map((item, index) => (
                  <tr key={item[idField]} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3 text-xs font-medium text-teal-600">#{String(index + 1).padStart(4, "0")}</td>
                    {listColumns.map(col => (
                      <td key={col.key} className="px-4 py-3 text-sm text-gray-700">
                        {col.render ? col.render(item[col.key], item, col.isStatus ? handleOpenStatusModal : null) : item[col.key]}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`${showRoute}/${item[idField]}`)}
                          className="p-1.5 text-teal-600 hover:bg-teal-50 ed-lg transition-colors" title="View">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button onClick={() => navigate(`${editRoute}/${item[idField]}`)}
                          className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Edit">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        {statusEndpoint && statusOptions.length > 0 && (
                          <button onClick={() => handleOpenStatusModal(item)}
                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Update Status">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </button>
                        )}
                        <button onClick={() => handleDelete(item[idField])}
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

          {filteredItems.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-sm font-medium text-gray-600">{searchQuery ? "No matching records" : "No records found"}</p>
              <p className="text-xs text-gray-400 mt-1">{searchQuery ? "Try adjusting your search" : `Create your first ${title.toLowerCase()} entry`}</p>
              {searchQuery ? (
                <button onClick={() => { setSearchQuery(""); setFilteredItems(items); }}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors">Clear Search</button>
              ) : (
                <button onClick={() => navigate(createRoute)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Create Entry
                </button>
              )}
            </div>
          )}

          {filteredItems.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">Showing {filteredItems.length} of {items.length} records</p>
            </div>
          )}
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 bg-teal-50 border-b border-teal-100">
              <h3 className="text-sm font-bold text-gray-800">Update Status</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Current Status</label>
                <div className="px-3 py-2 rounded-xl bg-teal-50 text-teal-700 text-sm font-medium capitalize">
                  {selectedItem?.[statusField]?.replace(/[-_]/g, " ")}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">New Status</label>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none">
                  <option value="">Select Status</option>
                  {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </div>
            <div className="px-5 py-4 bg-gray-50 flex justify-end gap-2 border-t border-gray-100">
              <button type="button" onClick={handleCloseStatusModal}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="button" onClick={handleStatusUpdate} disabled={savingStatus}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50">
                {savingStatus ? "Updating..." : "Update Status"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
