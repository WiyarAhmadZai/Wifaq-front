import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get, del, put } from "../../api/axios";
import Swal from "sweetalert2";

const Icons = {
  ArrowLeft: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  Edit: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Document: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Briefcase: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Building: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const getStatusBadge = (status) => {
  const styles = {
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    cancelled: "bg-gray-50 text-gray-700 border-gray-200",
  };
  return styles[status?.toLowerCase()] || "bg-gray-50 text-gray-700 border-gray-200";
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

export default function JobRequisitionShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    fetchItem();
  }, [id]);

  const fetchItem = async () => {
    setLoading(true);
    try {
      const response = await get(`/recruitment/job-requisitions/${id}`);
      setData(response.data?.data || response.data);
    } catch (error) {
      Swal.fire("Error", "Failed to load job requisition", "error");
      navigate("/recruitment/job-requisitions");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: "Delete this record?",
      text: "This action cannot be undone",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        await del(`/recruitment/job-requisitions/${id}`);
        Swal.fire("Deleted", "Record deleted successfully", "success");
        navigate("/recruitment/job-requisitions");
      } catch {
        Swal.fire("Error", "Failed to delete", "error");
      }
    }
  };

  const handleOpenStatusModal = () => {
    setNewStatus(data?.approval_status || "");
    setShowStatusModal(true);
  };

  const handleCloseStatusModal = () => {
    setShowStatusModal(false);
    setNewStatus("");
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) {
      Swal.fire("Error", "Please select a status", "error");
      return;
    }
    setSavingStatus(true);
    try {
      await put(`/recruitment/job-requisitions/${id}`, { approval_status: newStatus });
      Swal.fire({ icon: "success", title: "Status updated", timer: 1500, showConfirmButton: false });
      handleCloseStatusModal();
      fetchItem();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "Failed to update status", "error");
    } finally {
      setSavingStatus(false);
    }
  };

  const formatValue = (key, value) => {
    if (value === null || value === undefined) return "-";
    if (key === "created_at" || key === "updated_at") {
      return new Date(value).toLocaleString();
    }
    if (key === "employment_type") {
      return value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    }
    if (key === "approved_by" && data?.approved_by?.full_name) {
      return data.approved_by.full_name;
    }
    return value;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Record not found</p>
        <button
          onClick={() => navigate("/recruitment/job-requisitions")}
          className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
        >
          Back to List
        </button>
      </div>
    );
  }

  const mainFields = [
    { key: "position_title", label: "Position Title", icon: Icons.Briefcase },
    { key: "department", label: "Department", icon: Icons.Building },
    { key: "employment_type", label: "Employment Type", icon: Icons.Document },
    { key: "number_of_positions", label: "Number of Positions", icon: Icons.Document },
    { key: "justification", label: "Justification", icon: Icons.Document },
  ];

  const approvalFields = [
    { key: "approval_status", label: "Approval Status", icon: Icons.Check },
    { key: "approved_by", label: "Approved By", icon: Icons.Document },
  ];

  return (
    <div className="w-full px-4 sm:px-6 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/recruitment/job-requisitions")}
            className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
          >
            <Icons.ArrowLeft />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Job Requisition Details</h2>
            <p className="text-xs text-gray-500">View complete information</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/recruitment/job-requisitions/edit/${id}`)}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 text-xs font-medium"
          >
            <Icons.Edit />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-xs font-medium"
          >
            <Icons.Trash />
            Delete
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column - Primary Details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Status Card - Clickable */}
          <div
            onClick={handleOpenStatusModal}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600">
                <Icons.Check />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Current Status (Click to update)</p>
                <span
                  className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(
                    data.approval_status
                  )}`}
                >
                  {data.approval_status?.replace(/_/g, " ")}
                </span>
              </div>
              <div className="text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Job Details Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Icons.Briefcase />
              Job Details
            </h3>
            <div className="space-y-1">
              {mainFields.map((field) => (
                <div
                  key={field.key}
                  className="flex flex-col sm:flex-row sm:items-start py-3 border-b border-gray-100 last:border-0"
                >
                  <span className="text-xs text-gray-500 sm:w-1/3 mb-1 sm:mb-0 flex items-center gap-2">
                    <field.icon />
                    {field.label}
                  </span>
                  <span className="sm:w-2/3 text-sm text-gray-800">
                    {formatValue(field.key, data[field.key])}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Approval Details Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Icons.Check />
              Approval Information
            </h3>
            <div className="space-y-1">
              {approvalFields.map((field) => (
                <div
                  key={field.key}
                  className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-gray-100 last:border-0"
                >
                  <span className="text-xs text-gray-500 sm:w-1/3 mb-1 sm:mb-0 flex items-center gap-2">
                    <field.icon />
                    {field.label}
                  </span>
                  <span className="sm:w-2/3 text-sm text-gray-800">
                    {formatValue(field.key, data[field.key])}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Timeline & Meta */}
        <div className="space-y-5">
          {/* Timeline Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Icons.Clock />
              Activity Timeline
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 flex-shrink-0">
                  <Icons.Calendar />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Created On</p>
                  <p className="text-xs font-medium text-gray-800">
                    {data.created_at ? new Date(data.created_at).toLocaleString() : "-"}
                  </p>
                </div>
              </div>
              <div className="w-px h-4 bg-gray-200 ml-4"></div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0">
                  <Icons.Clock />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Last Updated</p>
                  <p className="text-xs font-medium text-gray-800">
                    {data.updated_at ? new Date(data.updated_at).toLocaleString() : "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Record Info Card */}
          <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl shadow-sm p-5 text-white">
            <h3 className="text-sm font-semibold mb-3">Record Information</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-teal-100">Record ID</span>
                <span className="text-xs font-medium">#{String(data.id).padStart(4, "0")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-teal-100">Type</span>
                <span className="text-xs font-medium">Job Requisition</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 bg-teal-50 border-b border-teal-100">
              <h3 className="text-sm font-bold text-gray-800">Update Status</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Current Status
                </label>
                <div className="px-3 py-2 rounded-xl bg-teal-50 text-teal-700 text-sm font-medium capitalize">
                  {data.approval_status?.replace(/[-_]/g, " ")}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none"
                >
                  <option value="">Select Status</option>
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-5 py-4 bg-gray-50 flex justify-end gap-2 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCloseStatusModal}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStatusUpdate}
                disabled={savingStatus}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50"
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
