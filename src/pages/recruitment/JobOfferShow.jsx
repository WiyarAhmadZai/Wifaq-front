import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get, del } from "../../api/axios";
import Swal from "sweetalert2";

const statusConfig = {
  draft: { color: "bg-gray-100 text-gray-700", dot: "bg-gray-400", label: "Draft" },
  sent: { color: "bg-blue-100 text-blue-700", dot: "bg-blue-500", label: "Sent" },
  accepted: { color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500", label: "Accepted" },
  declined: { color: "bg-red-100 text-red-700", dot: "bg-red-500", label: "Declined" },
  expired: { color: "bg-amber-100 text-amber-700", dot: "bg-amber-500", label: "Expired" },
};

export default function JobOfferShow() {
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
      const response = await get(`/recruitment/job-offers/${id}`);
      setData(response.data);
    } catch {
      Swal.fire("Error", "Failed to load job offer", "error");
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
        await del(`/recruitment/job-offers/${id}`);
        Swal.fire("Deleted", "Job offer deleted", "success");
        navigate("/recruitment/job-offers");
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
        <p className="text-gray-500">Job offer not found</p>
        <button onClick={() => navigate("/recruitment/job-offers")} className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
          Back to Job Offers
        </button>
      </div>
    );
  }

  const info = statusConfig[data.offer_status] || statusConfig.draft;

  const offerSteps = [
    { key: "draft", label: "Draft" },
    { key: "sent", label: "Sent" },
    { key: "accepted", label: "Accepted" },
  ];
  const stepOrder = ["draft", "sent", "accepted"];
  const currentStepIdx = stepOrder.indexOf(data.offer_status);
  const isNegative = data.offer_status === "declined" || data.offer_status === "expired";

  return (
    <div className="w-full px-4 sm:px-6 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/recruitment/job-offers")} className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Job Offer</h2>
            <p className="text-xs text-gray-500">Offer #{String(data.id).padStart(4, "0")}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate(`/recruitment/job-offers/edit/${id}`)} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium flex items-center gap-2">
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

      {/* Offer Progress */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Offer Progress</h3>
        {isNegative ? (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${data.offer_status === "declined" ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200"}`}>
            <div className={`w-3 h-3 rounded-full ${data.offer_status === "declined" ? "bg-red-500" : "bg-amber-500"}`} />
            <span className={`text-sm font-semibold ${data.offer_status === "declined" ? "text-red-700" : "text-amber-700"}`}>
              {data.offer_status === "declined" ? "Declined by Candidate" : "Offer Expired"}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {offerSteps.map((step, idx) => {
              const isPast = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              return (
                <div key={step.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                      isCurrent ? "bg-teal-500 text-white border-transparent shadow-lg" :
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
                      {step.label}
                    </span>
                  </div>
                  {idx < offerSteps.length - 1 && (
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
          {/* Offer Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Offer Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-teal-50 rounded-lg border border-teal-100">
                <p className="text-[10px] text-teal-600 uppercase font-semibold mb-1">Proposed Salary</p>
                <p className="text-xl font-bold text-teal-700">
                  {data.proposed_salary ? `${Number(data.proposed_salary).toLocaleString()} AFN` : "-"}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Start Date</p>
                <p className="text-sm font-medium text-gray-800">
                  {data.start_date ? new Date(data.start_date).toLocaleDateString() : "-"}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Application ID</p>
                <p className="text-sm text-gray-800">#{String(data.application_id || "").padStart(4, "0")}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Candidate</p>
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
                <p className="text-xs text-gray-500 mb-1">Offer Status</p>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${info.color}`}>
                  <span className={`w-2 h-2 rounded-full ${info.dot}`}></span>
                  {info.label}
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
                <span className="text-xs font-medium">Job Offer</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
