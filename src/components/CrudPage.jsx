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
  statusOptions = [],
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

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await get(apiEndpoint);
      // Handle both paginated (response.data.data) and non-paginated (response.data) responses
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

        if (status === 500) {
          errorTitle = "Server Error (500)";
          errorMessage =
            data?.message || "Internal server error. Check Laravel logs.";
        } else if (status === 401) {
          errorTitle = "Unauthorized (401)";
          errorMessage = "Please login to access this resource.";
        } else if (status === 403) {
          errorTitle = "Forbidden (403)";
          errorMessage = "You do not have permission to access this resource.";
        } else if (status === 404) {
          errorTitle = "Not Found (404)";
          errorMessage = "The requested resource was not found.";
        } else if (status === 422) {
          errorTitle = "Validation Error (422)";
          errorMessage =
            data?.message || "Validation failed. Please check your input.";
        } else {
          errorTitle = `Error (${status})`;
          errorMessage = data?.message || `HTTP ${status} error`;
        }
      } else if (error.request) {
        errorTitle = "Network Error";
        errorMessage =
          "Cannot connect to server. Please check if Laravel is running on localhost:8000";
      }

      Swal.fire({
        title: errorTitle,
        text: errorMessage,
        icon: "error",
        confirmButtonColor: "#0d9488",
      });
      setItems([]);
      setFilteredItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    navigate(createRoute);
  };

  const handleEdit = (item) => {
    navigate(`${editRoute}/${item[idField]}`);
  };

  const handleView = (item) => {
    navigate(`${showRoute}/${item[idField]}`);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You will not be able to recover this record!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#0d9488",
      cancelButtonColor: "#ef4444",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await del(`${deleteEndpoint ?? apiEndpoint}/${id}`);
        Swal.fire("Deleted!", "Record has been deleted.", "success");
        fetchItems();
      } catch (error) {
        Swal.fire("Error!", "Failed to delete record.", "error");
      }
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    if (!query) {
      setFilteredItems(items);
      return;
    }

    const fieldsToSearch =
      searchFields.length > 0
        ? searchFields
        : listColumns.map((col) => col.key);

    const filtered = items.filter((item) => {
      return fieldsToSearch.some((field) => {
        const value = item[field];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(query);
      });
    });

    setFilteredItems(filtered);
  };

  const getStatusBadge = (status) => {
    const styles = {
      approved: "bg-emerald-100 text-emerald-700",
      pending: "bg-amber-100 text-amber-700",
      rejected: "bg-red-100 text-red-700",
      new: "bg-blue-100 text-blue-700",
      completed: "bg-emerald-100 text-emerald-700",
      in_progress: "bg-blue-100 text-blue-700",
      active: "bg-emerald-100 text-emerald-700",
      inactive: "bg-gray-100 text-gray-700",
      "on-leave": "bg-amber-100 text-amber-700",
      on_leave: "bg-amber-100 text-amber-700",
    };
    return styles[status?.toLowerCase()] || "bg-gray-100 text-gray-700";
  };

  const handleOpenStatusModal = (item) => {
    setSelectedItem(item);
    setNewStatus(item.status || "");
    setShowStatusModal(true);
  };

  const handleCloseStatusModal = () => {
    setShowStatusModal(false);
    setSelectedItem(null);
    setNewStatus("");
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) {
      Swal.fire("Error", "Please select a status", "error");
      return;
    }
    setSavingStatus(true);
    try {
      await put(`${statusEndpoint}/${selectedItem[idField]}`, { status: newStatus });
      Swal.fire("Success", "Status updated successfully", "success");
      handleCloseStatusModal();
      fetchItems();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "Failed to update status", "error");
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">{title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage {title.toLowerCase()} records
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {searchable && (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search..."
                className="w-full sm:w-64 pl-10 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          )}
          {extraHeaderButtons}
          <button
            onClick={handleCreate}
            className="w-full sm:w-auto px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center justify-center gap-1.5 font-medium text-xs"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Entry
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent"></div>
          <p className="mt-2 text-gray-500 text-xs">Loading...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-teal-50">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">
                    ID
                  </th>
                  {listColumns.map((col) => (
                    <th
                      key={col.key}
                      className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider"
                    >
                      {col.label}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map((item, index) => (
                  <tr key={item[idField]} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs font-medium text-teal-600">
                      #{String(index + 1).padStart(4, "0")}
                    </td>
                    {listColumns.map((col) => (
                      <td
                        key={col.key}
                        className="px-3 py-2 text-xs text-gray-800"
                      >
                        {col.render
                          ? col.render(item[col.key], item)
                          : item[col.key]}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleView(item)}
                          className="p-1 text-teal-600 hover:bg-teal-50 rounded transition-colors"
                          title="View"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          title="Edit"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        {statusEndpoint && statusOptions.length > 0 && (
                          <button
                            onClick={() => handleOpenStatusModal(item)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Update Status"
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item[idField])}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
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
            <div className="text-center py-8 px-4">
              <svg
                className="w-10 h-10 mx-auto text-gray-300 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-gray-500 text-xs">
                {searchQuery ? "No matching records found" : "No records found"}
              </p>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setFilteredItems(items);
                  }}
                  className="mt-3 text-teal-600 hover:text-teal-700 font-medium text-xs"
                >
                  Clear search
                </button>
              )}
              {!searchQuery && (
                <button
                  onClick={handleCreate}
                  className="mt-3 text-teal-600 hover:text-teal-700 font-medium text-xs"
                >
                  Create your first entry
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Update Status</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
                <div className={`px-3 py-2 rounded-lg ${getStatusBadge(selectedItem?.status)} text-sm capitalize`}>
                  {selectedItem?.status?.replace(/[-_]/g, " ")}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                >
                  <option value="">Select Status</option>
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-4 py-3 bg-gray-50 flex justify-end gap-2 rounded-b-lg">
              <button
                type="button"
                onClick={handleCloseStatusModal}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStatusUpdate}
                disabled={savingStatus}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {savingStatus ? "Updating..." : "Update Status"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
