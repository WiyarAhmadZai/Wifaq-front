import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get } from "../../api/axios";
import Swal from "sweetalert2";

const Icons = {
  ArrowLeft: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 19l-7-7m0 0l7-7m-7 7h18"
      />
    </svg>
  ),
  Edit: () => (
    <svg
      className="w-4 h-4"
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
  ),
  Calendar: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
  CheckCircle: () => (
    <svg
      className="w-5 h-5"
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
  ),
};

export default function AcademicTermShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [term, setTerm] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTerm();
  }, [id]);

  const fetchTerm = async () => {
    setLoading(true);
    try {
      const response = await get(
        `/student-management/academic-terms/show/${id}`,
      );
      const termData = response.data?.data || response.data;
      setTerm(termData);
    } catch (error) {
      console.error("Error fetching term:", error);
      Swal.fire("Error", "Failed to load academic term", "error");
      navigate("/student-management/academic-terms");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getDuration = () => {
    if (!term?.start_date || !term?.end_date) return "—";
    const start = new Date(term.start_date);
    const end = new Date(term.end_date);
    const months = Math.round((end - start) / (30 * 24 * 60 * 60 * 1000));
    return `${months} months`;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-100 border-t-teal-600"></div>
          <span className="text-gray-500 text-sm">
            Loading academic term...
          </span>
        </div>
      </div>
    );
  }

  if (!term) {
    return (
      <div className="px-6 py-8">
        <div className="max-w-2xl mx-auto text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icons.Calendar />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Academic Term Not Found
          </h3>
          <p className="text-gray-500 mb-6">
            The requested academic term could not be found.
          </p>
          <button
            onClick={() => navigate("/student-management/academic-terms")}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
          >
            Back to Academic Terms
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/student-management/academic-terms")}
            className="p-2.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all"
          >
            <Icons.ArrowLeft />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Academic Term Details
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              View complete term information
            </p>
          </div>
        </div>
        <button
          onClick={() =>
            navigate(`/student-management/academic-terms/edit/${id}`)
          }
          className="px-5 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all flex items-center gap-2 font-medium shadow-sm hover:shadow-md"
        >
          <Icons.Edit />
          Edit Term
        </button>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Status Banner */}
        <div
          className={`px-6 py-4 ${term.is_current ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100" : "bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200"}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${term.is_current ? "bg-emerald-100 text-emerald-600" : "bg-gray-200 text-gray-500"}`}
              >
                <Icons.Calendar />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">{term.name}</h2>
                <p className="text-sm text-gray-500">
                  Academic Year {new Date(term.start_date).getFullYear()}-
                  {new Date(term.end_date).getFullYear()}
                </p>
              </div>
            </div>
            {term.is_current && (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                <Icons.CheckCircle />
                Current Term
              </div>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Duration Card */}
            <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-xl p-5 border border-teal-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-teal-200 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-teal-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <span className="text-sm font-medium text-teal-700">
                  Duration
                </span>
              </div>
              <p className="text-2xl font-bold text-teal-800">
                {getDuration()}
              </p>
              <p className="text-xs text-teal-600 mt-1">Total term length</p>
            </div>

            {/* Start Date Card */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-5 border border-blue-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-blue-200 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-blue-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <span className="text-sm font-medium text-blue-700">
                  Start Date
                </span>
              </div>
              <p className="text-lg font-bold text-blue-800">
                {formatDate(term.start_date)}
              </p>
              <p className="text-xs text-blue-600 mt-1">Term begins</p>
            </div>

            {/* End Date Card */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-5 border border-purple-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-purple-200 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-purple-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <span className="text-sm font-medium text-purple-700">
                  End Date
                </span>
              </div>
              <p className="text-lg font-bold text-purple-800">
                {formatDate(term.end_date)}
              </p>
              <p className="text-xs text-purple-600 mt-1">Term ends</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Term Timeline
            </h3>
            <div className="relative">
              <div className="absolute left-0 right-0 top-1/2 h-1 bg-gray-100 -translate-y-1/2 rounded-full"></div>
              <div className="relative flex justify-between">
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 bg-teal-500 rounded-full border-4 border-white shadow"></div>
                  <span className="text-xs font-medium text-teal-600 mt-2">
                    Start
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(term.start_date)}
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-4 h-4 rounded-full border-4 border-white shadow ${term.is_current ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`}
                  ></div>
                  <span
                    className={`text-xs font-medium mt-2 ${term.is_current ? "text-emerald-600" : "text-gray-400"}`}
                  >
                    {term.is_current ? "Active" : "Inactive"}
                  </span>
                  <span className="text-xs text-gray-500">Current Status</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 bg-purple-500 rounded-full border-4 border-white shadow"></div>
                  <span className="text-xs font-medium text-purple-600 mt-2">
                    End
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(term.end_date)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <div className="flex flex-wrap gap-6 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                <span>
                  Created: {new Date(term.created_at).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-teal-400 rounded-full"></span>
                <span>
                  Updated: {new Date(term.updated_at).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                <span>ID: #{term.id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
