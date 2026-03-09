import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, del } from "../../../api/axios";
import Swal from "sweetalert2";

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
  User: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
};

export default function TeachersShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeacher();
  }, [id]);

  const fetchTeacher = async () => {
    setLoading(true);
    try {
      const response = await get(`/teacher-management/teachers/show/${id}`);
      const data = response.data?.data || response.data;
      setTeacher(data);
    } catch (error) {
      Swal.fire("Error", "Failed to load teacher data", "error");
      navigate("/teacher-management/teachers");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
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
        await del(`/teacher-management/teachers/delete/${id}`);
        Swal.fire("Deleted!", "Teacher has been deleted.", "success");
        navigate("/teacher-management/teachers");
      } catch (error) {
        Swal.fire("Error", "Failed to delete teacher", "error");
      }
    }
  };

  const formatValue = (value) => value || "—";
  const capitalize = (val) => val ? val.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : "—";

  const getStatusColor = (status) => {
    const colors = {
      active: "bg-emerald-100 text-emerald-700",
      inactive: "bg-gray-100 text-gray-700",
      "on-leave": "bg-amber-100 text-amber-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  if (loading) {
    return (
      <div className="px-4 py-4">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="px-4 py-4">
        <div className="text-center py-12">
          <p className="text-gray-500">Teacher not found</p>
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
            onClick={() => navigate("/teacher-management/teachers")}
            className="p-2.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all"
          >
            <Icons.ArrowLeft />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Teacher Details</h1>
            <p className="text-sm text-gray-500 mt-0.5">View teacher information</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all flex items-center gap-2 font-medium"
          >
            <Icons.Trash />
            Delete
          </button>
          <button
            onClick={() => navigate(`/teacher-management/teachers/edit/${id}`)}
            className="px-5 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all flex items-center gap-2 font-medium shadow-sm hover:shadow-md"
          >
            <Icons.Edit />
            Edit Teacher
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Teacher ID Banner */}
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center text-white">
              <Icons.User />
            </div>
            <div>
              <p className="text-teal-100 text-sm font-medium">Teacher ID</p>
              <h2 className="text-3xl font-bold text-white tracking-wider">
                {teacher.teacher_id}
              </h2>
            </div>
            <div className="ml-auto">
              <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusColor(teacher.status)}`}>
                {capitalize(teacher.status)}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Quick Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">Full Name</span>
              <p className="font-semibold text-gray-800 mt-1">{teacher.first_name} {teacher.last_name}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
              <span className="text-xs font-medium text-purple-700 uppercase tracking-wide">Employment Type</span>
              <p className="font-semibold text-gray-800 mt-1">{capitalize(teacher.employment_type)}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <span className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Qualification</span>
              <p className="font-semibold text-gray-800 mt-1">{capitalize(teacher.qualification)}</p>
            </div>
          </div>

          {/* Personal Information */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Icons.User />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Personal Information</h3>
            </div>

            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">First Name</label>
                  <p className="text-lg font-semibold text-gray-800 mt-1">{formatValue(teacher.first_name)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Name</label>
                  <p className="text-lg font-semibold text-gray-800 mt-1">{formatValue(teacher.last_name)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
                  <p className="text-gray-700 mt-1">{formatValue(teacher.email)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</label>
                  <p className="text-gray-700 mt-1">{formatValue(teacher.phone)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">CNIC</label>
                  <p className="text-gray-700 mt-1">{formatValue(teacher.cnic)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date of Birth</label>
                  <p className="text-gray-700 mt-1">
                    {teacher.date_of_birth ? new Date(teacher.date_of_birth).toLocaleDateString() : "—"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gender</label>
                  <p className="text-gray-700 mt-1">{capitalize(teacher.gender)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
                  <p className="mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(teacher.status)}`}>
                      {capitalize(teacher.status)}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800">Address</h3>
            </div>
            <div className="bg-purple-50/50 rounded-xl p-5 border border-purple-100">
              <p className="text-gray-700 whitespace-pre-wrap">{teacher.address || "—"}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-6 border-t border-gray-100">
            <div className="flex flex-wrap gap-6 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                <span>Created: {new Date(teacher.created_at).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-teal-400 rounded-full"></span>
                <span>Updated: {new Date(teacher.updated_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
