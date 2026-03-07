import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get } from "../../api/axios";
import Swal from "sweetalert2";

const Icons = {
  ArrowLeft: () => (
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
};

export default function ParentShow() {
  const navigate = useNavigate();
  const { id } = useParams();
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
    <div className="px-4 py-4 mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/student-management/parents")}
            className="p-2 text-gray-500 hover:text-teal-600"
          >
            <Icons.ArrowLeft />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Family Details</h2>
            <p className="text-sm text-gray-500">View family information</p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/student-management/parents/edit/${id}`)}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 font-medium text-xs"
        >
          <Icons.Edit />
          Edit
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* Family ID Header */}
        <div className="mb-6 pb-4 border-b border-gray-200">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Family ID
          </span>
          <p className="text-2xl font-bold text-teal-700 mt-1">
            {family.family_id}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Father Information */}
          <div className="md:col-span-2">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-100">
              Father's Information
            </h3>
          </div>
          <div>
            <span className="text-xs text-gray-500">Name</span>
            <p className="font-medium text-gray-800 mt-0.5">
              {formatValue(family.father_name)}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Name (English)</span>
            <p className="font-medium text-gray-800 mt-0.5">
              {formatValue(family.father_name_en)}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Grandfather's Name</span>
            <p className="font-medium text-gray-800 mt-0.5">
              {formatValue(family.grandfather_name)}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-500">
              Grandfather's Name (English)
            </span>
            <p className="font-medium text-gray-800 mt-0.5">
              {formatValue(family.grandfather_name_en)}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Education Level</span>
            <p className="font-medium text-gray-800 mt-0.5">
              {formatValue(family.father_education_level)}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Occupation</span>
            <p className="font-medium text-gray-800 mt-0.5">
              {formatValue(family.father_occupation)}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Phone</span>
            <p className="font-medium text-gray-800 mt-0.5">
              {formatValue(family.father_phone)}
            </p>
          </div>

          {/* Mother Information */}
          <div className="md:col-span-2 mt-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-100">
              Mother's Information
            </h3>
          </div>
          <div>
            <span className="text-xs text-gray-500">Name</span>
            <p className="font-medium text-gray-800 mt-0.5">
              {formatValue(family.mother_name)}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Education Level</span>
            <p className="font-medium text-gray-800 mt-0.5">
              {formatValue(family.mother_education_level)}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Phone</span>
            <p className="font-medium text-gray-800 mt-0.5">
              {formatValue(family.mother_phone)}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Mother Tongue</span>
            <p className="font-medium text-gray-800 mt-0.5">
              {formatValue(family.mother_tongue)}
            </p>
          </div>

          {/* Financial Information */}
          <div className="md:col-span-2 mt-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-100">
              Financial Information
            </h3>
          </div>
          <div>
            <span className="text-xs text-gray-500">Monthly Income (USD)</span>
            <p className="font-medium text-gray-800 mt-0.5">
              {formatCurrency(family.monthly_income_usd)}
            </p>
          </div>

          {/* Address */}
          <div className="md:col-span-2 mt-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-100">
              Address
            </h3>
            <p className="font-medium text-gray-800 mt-0.5 whitespace-pre-wrap">
              {formatValue(family.address)}
            </p>
          </div>

          {/* Timestamps */}
          <div className="md:col-span-2 mt-6 pt-4 border-t border-gray-200">
            <div className="flex gap-6 text-xs text-gray-500">
              <span>
                Created: {new Date(family.created_at).toLocaleString()}
              </span>
              <span>
                Updated: {new Date(family.updated_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
