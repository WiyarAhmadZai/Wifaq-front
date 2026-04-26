import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, del, put } from "../../api/axios";
import Swal from "sweetalert2";
import { useResourcePermissions } from "../../admin/utils/useResourcePermissions";

const Icons = {
  ArrowLeft: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  Briefcase: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Document: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Location: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  List: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
};

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft", color: "bg-amber-100 text-amber-700" },
  { value: "published", label: "Published", color: "bg-emerald-100 text-emerald-700" },
  { value: "closed", label: "Closed", color: "bg-red-100 text-red-700" },
  { value: "archived", label: "Archived", color: "bg-gray-100 text-gray-700" },
];

export default function JobPostingShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { canUpdate, canDelete } = useResourcePermissions("job-postings");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await get(`/recruitment/job-postings/${id}`);
      setData(response.data?.data || response.data);
      setError(null);
    } catch (err) {
      setError("Failed to load job posting");
      Swal.fire("Error", "Failed to load job posting", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: "Delete Job Posting?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Delete",
    });

    if (result.isConfirmed) {
      try {
        await del(`/recruitment/job-postings/${id}`);
        Swal.fire("Deleted", "Job posting deleted successfully", "success");
        navigate("/recruitment/job-postings");
      } catch {
        Swal.fire("Error", "Failed to delete job posting", "error");
      }
    }
  };

  const handleOpenStatusModal = () => {
    setNewStatus(data?.status || "");
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
      await put(`/recruitment/job-postings/${id}`, { status: newStatus });
      Swal.fire({
        icon: "success",
        title: "Status updated",
        timer: 1500,
        showConfirmButton: false,
      });
      handleCloseStatusModal();
      fetchData();
    } catch (error) {
      Swal.fire(
        "Error",
        error.response?.data?.message || "Failed to update status",
        "error"
      );
    } finally {
      setSavingStatus(false);
    }
  };

  const getStatusColor = (status) => {
    const option = STATUS_OPTIONS.find((opt) => opt.value === status);
    return option?.color || "bg-gray-100 text-gray-700";
  };

  const getStatusLabel = (status) => {
    const option = STATUS_OPTIONS.find((opt) => opt.value === status);
    return option?.label || status;
  };

  if (loading) {
    return (
      <div className="w-full px-4 sm:px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full px-4 sm:px-6 py-8">
        <div className="text-center">
          <p className="text-red-500">{error || "Job posting not found"}</p>
          <button
            onClick={() => navigate("/recruitment/job-postings")}
            className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg"
          >
            Back to List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/recruitment/job-postings")}
            className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all"
          >
            <Icons.ArrowLeft />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Job Posting Details</h2>
            <p className="text-xs text-gray-500">View complete information</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canUpdate && (
            <button
              onClick={() => navigate(`/recruitment/job-postings/edit/${id}`)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors"
            >
              <Icons.Edit />
              Edit
            </button>
          )}
          {canDelete && (
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 transition-colors"
            >
              <Icons.Trash />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Status Card */}
      <div className="mb-6">
        {canUpdate ? (
          <button
            onClick={handleOpenStatusModal}
            className={`w-full sm:w-auto px-6 py-4 rounded-xl ${getStatusColor(
              data.status
            )} hover:opacity-80 transition-opacity cursor-pointer text-left`}
          >
            <p className="text-[10px] uppercase tracking-wider opacity-75 mb-1">Current Status</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{getStatusLabel(data.status)}</span>
              <span className="text-[10px] opacity-75">(Click to update)</span>
            </div>
          </button>
        ) : (
          <div className={`w-full sm:w-auto px-6 py-4 rounded-xl ${getStatusColor(data.status)} text-left`}>
            <p className="text-[10px] uppercase tracking-wider opacity-75 mb-1">Current Status</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{getStatusLabel(data.status)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-teal-50 to-teal-50 border-b border-teal-100">
              <h3 className="text-sm font-bold text-gray-800">Job Details</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Job Title</p>
                <p className="text-base font-medium text-gray-800">{data.title}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.description}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Location</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Icons.Location />
                  </div>
                  <span className="text-sm font-medium text-gray-800">{data.location}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-teal-50 to-teal-50 border-b border-teal-100">
              <h3 className="text-sm font-bold text-gray-800">Requirements</h3>
            </div>
            <div className="p-5">
              {data.requirements && data.requirements.length > 0 ? (
                <ul className="space-y-2">
                  {data.requirements.map((req, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icons.Check />
                      </div>
                      <span className="text-sm text-gray-700">{req}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400 italic">No requirements listed</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Requisition Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-100">
              <h3 className="text-sm font-bold text-gray-800">Requisition Info</h3>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Position</p>
                <p className="text-sm font-medium text-gray-800">
                  {data.requisition?.position_title || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Department</p>
                <p className="text-sm font-medium text-gray-800">
                  {data.requisition?.department || "N/A"}
                </p>
              </div>
              {data.requisition?.deadline_date && (
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Deadline</p>
                  <p className="text-sm font-medium text-gray-800">
                    {new Date(data.requisition.deadline_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Record Info */}
          <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl shadow-sm p-5 text-white">
            <h3 className="text-sm font-semibold mb-3">Record Information</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-teal-100">Record ID</span>
                <span className="text-xs font-medium">#{String(data.id).padStart(4, "0")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-teal-100">Created</span>
                <span className="text-xs font-medium">
                  {data.created_at ? new Date(data.created_at).toLocaleDateString() : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-teal-100">Updated</span>
                <span className="text-xs font-medium">
                  {data.updated_at ? new Date(data.updated_at).toLocaleDateString() : "-"}
                </span>
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
                  {data.status?.replace(/[-_]/g, " ")}
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
