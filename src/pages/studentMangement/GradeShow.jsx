import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get } from "../../api/axios";
import Swal from "sweetalert2";

export default function GradeShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [grade, setGrade] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGrade();
  }, [id]);

  const fetchGrade = async () => {
    setLoading(true);
    try {
      const response = await get(`/grades/show/${id}`);
      setGrade(response.data?.data || response.data);
    } catch (error) {
      Swal.fire("Error", "Failed to load grade", "error");
      navigate("/student-management/grades");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-100 border-t-teal-600"></div>
          <span className="text-gray-500 text-sm">Loading grade...</span>
        </div>
      </div>
    );
  }

  if (!grade) return null;

  return (
    <div className="px-4 py-6 mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/student-management/grades")}
            className="p-2.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Grade Details</h1>
            <p className="text-sm text-gray-500 mt-0.5">View grade information</p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/student-management/grades/edit/${id}`)}
          className="px-5 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all flex items-center gap-2 font-medium shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit Grade
        </button>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-xl">
        {/* Banner */}
        <div className="px-6 py-5 bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-teal-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center text-teal-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{grade.name}</h2>
              <p className="text-sm text-gray-500">Grade Record</p>
            </div>
          </div>
        </div>

        {/* Fields */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Grade Name</p>
            <p className="text-sm font-semibold text-gray-800">{grade.name}</p>
          </div>
          <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
            <p className="text-[10px] font-semibold text-teal-600 uppercase tracking-wider mb-1">Base Fee</p>
            <p className="text-sm font-semibold text-teal-800">
              {parseFloat(grade.base_fee).toLocaleString()} AFN
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-0 border-t border-gray-100 mt-2">
          <div className="flex flex-wrap gap-5 text-xs text-gray-400 pt-4">
            <span>ID: #{grade.id}</span>
            <span>Created: {new Date(grade.created_at).toLocaleString()}</span>
            <span>Updated: {new Date(grade.updated_at).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
