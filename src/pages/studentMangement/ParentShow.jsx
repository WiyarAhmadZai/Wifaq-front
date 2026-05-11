import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get } from "../../api/axios";
import Swal from "sweetalert2";
import { useResourcePermissions } from "../../admin/utils/useResourcePermissions";

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
  User: () => (
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
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  ),
  Phone: () => (
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
        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
      />
    </svg>
  ),
  MapPin: () => (
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
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  ),
  Dollar: () => (
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
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  IdCard: () => (
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
        d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3 3 0 01-3 3m9-3a3 3 0 01-3 3m3-3h-6"
      />
    </svg>
  ),
};

export default function ParentShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { canUpdate } = useResourcePermissions("parents");
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFamily();
  }, [id]);

  const fetchFamily = async () => {
    setLoading(true);
    try {
      const response = await get(`/student-management/families/show/${id}`);
      // API returns { success: true, data: { family object } }
      const familyData = response.data?.data || response.data;
      setFamily(familyData);
    } catch (error) {
      console.error("Error fetching family:", error);
      Swal.fire("Error", "Failed to load family data", "error");
      navigate("/student-management/parents");
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value) => value || "—";
  const formatCurrency = (value) =>
    value ? `$${parseFloat(value).toLocaleString()}` : "—";

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

  if (!family) {
    return (
      <div className="px-4 py-4">
        <div className="text-center py-12">
          <p className="text-gray-500">Family not found</p>
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
            onClick={() => navigate("/student-management/parents")}
            className="p-2.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all"
          >
            <Icons.ArrowLeft />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Family Details</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              View complete family information
            </p>
          </div>
        </div>
        {canUpdate && (
          <button
            onClick={() => navigate(`/student-management/parents/edit/${id}`)}
            className="px-5 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all flex items-center gap-2 font-medium shadow-sm hover:shadow-md"
          >
            <Icons.Edit />
            Edit Family
          </button>
        )}
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Family ID Banner */}
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Icons.IdCard />
            </div>
            <div>
              <p className="text-teal-100 text-sm font-medium">Family ID</p>
              <h2 className="text-3xl font-bold text-white tracking-wider">
                {family.family_id}
              </h2>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Quick Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <Icons.Phone />
                <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                  Father's Phone
                </span>
              </div>
              <p className="font-semibold text-gray-800">
                {family.father_phone || "—"}
              </p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
              <div className="flex items-center gap-2 mb-2">
                <Icons.Phone />
                <span className="text-xs font-medium text-purple-700 uppercase tracking-wide">
                  Mother's Phone
                </span>
              </div>
              <p className="font-semibold text-gray-800">
                {family.mother_phone || "—"}
              </p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <div className="flex items-center gap-2 mb-2">
                <Icons.Dollar />
                <span className="text-xs font-medium text-emerald-700 uppercase tracking-wide">
                  Monthly Income
                </span>
              </div>
              <p className="font-semibold text-gray-800">
                {formatCurrency(family.monthly_income_usd)}
              </p>
            </div>
            {family.email && (
              <div className="bg-teal-50 rounded-xl p-4 border border-teal-100 md:col-span-3">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs font-medium text-teal-700 uppercase tracking-wide">
                    Email Address
                  </span>
                </div>
                <p className="font-semibold text-gray-800">{family.email}</p>
              </div>
            )}
          </div>

          {/* Father's Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800">
                Father's Information
              </h3>
            </div>

            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Full Name
                  </label>
                  <p className="text-lg font-semibold text-gray-800 mt-1">
                    {family.father_name}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Name (English)
                  </label>
                  <p className="text-gray-700 mt-1">
                    {family.father_name_en || "—"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Grandfather's Name
                  </label>
                  <p className="text-gray-700 mt-1">
                    {family.grandfather_name || "—"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Grandfather (English)
                  </label>
                  <p className="text-gray-700 mt-1">
                    {family.grandfather_name_en || "—"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Education Level
                  </label>
                  <p className="text-gray-700 mt-1">
                    {family.father_education_level || "—"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Occupation
                  </label>
                  <p className="text-gray-700 mt-1">
                    {family.father_occupation || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Mother's Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800">
                Mother's Information
              </h3>
            </div>

            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Full Name
                  </label>
                  <p className="text-lg font-semibold text-gray-800 mt-1">
                    {family.mother_name}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Education Level
                  </label>
                  <p className="text-gray-700 mt-1">
                    {family.mother_education_level || "—"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Mother Tongue
                  </label>
                  <p className="text-gray-700 mt-1">
                    {family.mother_tongue || "—"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Phone
                  </label>
                  <p className="text-gray-700 mt-1">
                    {family.mother_phone || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Permanent Residence */}
          {(family.permanent_province || family.permanent_district || family.permanent_village) && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" /></svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800">Permanent Residence</h3>
            </div>
            <div className="bg-indigo-50/50 rounded-xl p-5 border border-indigo-100 grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500">Province</label>
                <p className="text-gray-700 mt-1">{family.permanent_province || "—"}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">District</label>
                <p className="text-gray-700 mt-1">{family.permanent_district || "—"}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Village</label>
                <p className="text-gray-700 mt-1">{family.permanent_village || "—"}</p>
              </div>
            </div>
          </div>
          )}

          {/* Temporary Residence */}
          {(family.temporary_province || family.temporary_district || family.temporary_village) && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800">Temporary Residence</h3>
            </div>
            <div className="bg-amber-50/50 rounded-xl p-5 border border-amber-100 grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500">Province</label>
                <p className="text-gray-700 mt-1">{family.temporary_province || "—"}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">District</label>
                <p className="text-gray-700 mt-1">{family.temporary_district || "—"}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Village</label>
                <p className="text-gray-700 mt-1">{family.temporary_village || "—"}</p>
              </div>
            </div>
          </div>
          )}

          {/* Address Section */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Icons.MapPin />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Address</h3>
            </div>
            <div className="bg-purple-50/50 rounded-xl p-5 border border-amber-100">
              <p className="text-gray-700 whitespace-pre-wrap">
                {family.address || "—"}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-6 border-t border-gray-100">
            <div className="flex flex-wrap gap-6 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                <span>
                  Created: {new Date(family.created_at).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-teal-400 rounded-full"></span>
                <span>
                  Updated: {new Date(family.updated_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
