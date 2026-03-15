import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get, del } from "../../api/axios";
import Swal from "sweetalert2";

const pipelineStages = [
  { key: "received", label: "Received", color: "bg-blue-500", light: "bg-blue-100 text-blue-700" },
  { key: "screening", label: "Screening", color: "bg-amber-500", light: "bg-amber-100 text-amber-700" },
  { key: "shortlisted", label: "Shortlisted", color: "bg-purple-500", light: "bg-purple-100 text-purple-700" },
  { key: "interview", label: "Interview", color: "bg-cyan-500", light: "bg-cyan-100 text-cyan-700" },
  { key: "offer", label: "Offer", color: "bg-indigo-500", light: "bg-indigo-100 text-indigo-700" },
  { key: "hired", label: "Hired", color: "bg-emerald-500", light: "bg-emerald-100 text-emerald-700" },
];

export default function ApplicationShow() {
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
      const response = await get(`/recruitment/applications/${id}`);
      setData(response.data);
    } catch {
      Swal.fire("Error", "Failed to load application", "error");
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
        await del(`/recruitment/applications/${id}`);
        Swal.fire("Deleted", "Application deleted", "success");
        navigate("/recruitment/applications");
      } catch {
        Swal.fire("Error", "Failed to delete", "error");
      }
    }
  };

  const getCurrentStageIndex = () => {
    if (!data) return -1;
    if (data.status === "rejected" || data.status === "withdrawn") return -1;
    return pipelineStages.findIndex((s) => s.key === data.status);
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
        <p className="text-gray-500">Application not found</p>
        <button onClick={() => navigate("/recruitment/applications")} className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
          Back to Applications
        </button>
      </div>
    );
  }

  const stageIndex = getCurrentStageIndex();
  const isRejected = data.status === "rejected";
  const isWithdrawn = data.status === "withdrawn";

  return (
    <div className="w-full px-4 sm:px-6 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/recruitment/applications")} className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-800">{data.candidate_name}</h2>
            <p className="text-xs text-gray-500">Application #{String(data.id).padStart(4, "0")}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate(`/recruitment/applications/edit/${id}`)} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium flex items-center gap-2">
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

      {/* Pipeline Progress */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Application Pipeline</h3>
        {(isRejected || isWithdrawn) ? (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${isRejected ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200"}`}>
            <div className={`w-3 h-3 rounded-full ${isRejected ? "bg-red-500" : "bg-amber-500"}`} />
            <span className={`text-sm font-semibold ${isRejected ? "text-red-700" : "text-amber-700"}`}>
              {isRejected ? "Rejected" : "Withdrawn"}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {pipelineStages.map((stage, idx) => {
              const isPast = idx < stageIndex;
              const isCurrent = idx === stageIndex;
              return (
                <div key={stage.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                      isCurrent ? `${stage.color} text-white border-transparent shadow-lg` :
                      isPast ? "bg-teal-100 border-teal-400 text-teal-700" :
                      "bg-gray-100 border-gray-200 text-gray-400"
                    }`}>
                      {isPast ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span className={`text-[9px] font-semibold mt-1 ${isCurrent ? "text-gray-800" : isPast ? "text-teal-600" : "text-gray-400"}`}>
                      {stage.label}
                    </span>
                  </div>
                  {idx < pipelineStages.length - 1 && (
                    <div className={`h-0.5 w-full mx-1 rounded-full mb-4 ${isPast ? "bg-teal-300" : "bg-gray-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Contact Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Contact Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Email</p>
                <p className="text-sm text-gray-800">{data.email || "-"}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Phone</p>
                <p className="text-sm text-gray-800">{data.phone || "-"}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Source</p>
                <p className="text-sm text-gray-800 capitalize">{data.source?.replace(/_/g, " ") || "-"}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Applied On</p>
                <p className="text-sm text-gray-800">{data.created_at ? new Date(data.created_at).toLocaleDateString() : "-"}</p>
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
                HR Notes
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
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                  data.status === "hired" ? "bg-emerald-100 text-emerald-700" :
                  data.status === "rejected" ? "bg-red-100 text-red-700" :
                  data.status === "withdrawn" ? "bg-amber-100 text-amber-700" :
                  "bg-blue-100 text-blue-700"
                }`}>
                  {data.status?.replace(/_/g, " ")}
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Applied</p>
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
                <span className="text-xs font-medium">Application</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
