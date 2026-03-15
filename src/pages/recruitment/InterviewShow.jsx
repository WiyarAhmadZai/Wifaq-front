import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get, del } from "../../api/axios";
import Swal from "sweetalert2";

const interviewTypeLabels = {
  phone: { label: "Phone", icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z", bg: "bg-blue-100 text-blue-600" },
  in_person: { label: "In Person", icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z", bg: "bg-emerald-100 text-emerald-600" },
  video: { label: "Video", icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z", bg: "bg-purple-100 text-purple-600" },
  panel: { label: "Panel", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z", bg: "bg-amber-100 text-amber-600" },
};

const statusConfig = {
  scheduled: { color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  completed: { color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  cancelled: { color: "bg-red-100 text-red-700", dot: "bg-red-500" },
};

export default function InterviewShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await get(`/recruitment/interviews/${id}`);
      setData(response.data);
    } catch {
      Swal.fire("Error", "Failed to load interview", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This action cannot be undone",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete",
    });
    if (result.isConfirmed) {
      try {
        await del(`/recruitment/interviews/${id}`);
        Swal.fire("Deleted", "Interview deleted", "success");
        navigate("/recruitment/interviews");
      } catch {
        Swal.fire("Error", "Failed to delete", "error");
      }
    }
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
        <p className="text-gray-500">Interview not found</p>
        <button onClick={() => navigate("/recruitment/interviews")} className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
          Back to Interviews
        </button>
      </div>
    );
  }

  const typeInfo = interviewTypeLabels[data.interview_type] || interviewTypeLabels.in_person;
  const statusInfo = statusConfig[data.status] || statusConfig.scheduled;
  const scheduledDate = data.scheduled_at ? new Date(data.scheduled_at) : null;
  const isPast = scheduledDate && scheduledDate < new Date();

  return (
    <div className="w-full px-4 sm:px-6 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/recruitment/interviews")} className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Interview Details</h2>
            <p className="text-xs text-gray-500">Interview #{String(data.id).padStart(4, "0")}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate(`/recruitment/interviews/edit/${id}`)} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-medium flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      </div>

      {/* Interview Type Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-5">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-xl ${typeInfo.bg} flex items-center justify-center`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={typeInfo.icon} />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1">Interview Type</p>
            <p className="text-base font-bold text-gray-800">{typeInfo.label} Interview</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusInfo.color}`}>
            <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`}></span>
            {data.status?.charAt(0).toUpperCase() + data.status?.slice(1)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Schedule & Location */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Schedule & Location
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Date</p>
                <p className="text-sm text-gray-800">{scheduledDate ? scheduledDate.toLocaleDateString() : "-"}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Time</p>
                <p className="text-sm text-gray-800">{scheduledDate ? scheduledDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg sm:col-span-2">
                <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Location</p>
                <p className="text-sm text-gray-800">{data.location || "-"}</p>
              </div>
            </div>
            {isPast && data.status === "scheduled" && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-xs font-medium text-amber-700">This interview is past its scheduled time but still marked as scheduled.</span>
              </div>
            )}
          </div>

          {/* Candidate Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Candidate
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Application ID</p>
                <p className="text-sm text-gray-800">#{String(data.application_id || "").padStart(4, "0")}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Candidate Name</p>
                <p className="text-sm text-gray-800">{data.candidate_name || data.application?.candidate_name || "-"}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {data.notes && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Notes
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.notes}</p>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* Status Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Current Status</p>
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusInfo.color}`}>
                  {data.status}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Timeline
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Created</p>
                  <p className="text-xs font-medium text-gray-800">{data.created_at ? new Date(data.created_at).toLocaleString() : "-"}</p>
                </div>
              </div>
              <div className="w-px h-4 bg-gray-200 ml-4"></div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Last Updated</p>
                  <p className="text-xs font-medium text-gray-800">{data.updated_at ? new Date(data.updated_at).toLocaleString() : "-"}</p>
                </div>
              </div>
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
                <span className="text-xs text-teal-100">Type</span>
                <span className="text-xs font-medium">Interview</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
