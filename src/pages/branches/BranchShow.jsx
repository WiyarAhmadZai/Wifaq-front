import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export default function BranchShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBranch();
  }, [id]);

  const fetchBranch = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/branches/show/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setItem(result.data);
        }
      } else {
        Swal.fire("Error", "Failed to fetch branch data", "error");
        navigate("/branches");
      }
    } catch (error) {
      console.error("Error fetching branch:", error);
      Swal.fire("Error", "Failed to fetch branch data", "error");
      navigate("/branches");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    return status ? (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
        Active
      </span>
    ) : (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        Inactive
      </span>
    );
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

  if (!item) {
    return (
      <div className="px-4 py-4">
        <div className="text-center py-12">
          <p className="text-gray-500">Branch not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/branches")}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icons.ArrowLeft />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Branch Details</h2>
            <p className="text-sm text-gray-500">View branch information</p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/branches/edit/${id}`)}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 font-medium"
        >
          <Icons.Edit />
          Edit
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <span className="text-sm text-gray-500">Branch Name</span>
            <p className="font-medium text-gray-800 mt-0.5">
              {item.name || "—"}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Branch Code</span>
            <p className="font-medium text-gray-800 mt-0.5">
              {item.code || "—"}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Phone</span>
            <p className="font-medium text-gray-800 mt-0.5">
              {item.phone || "—"}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Branch Manager</span>
            <p className="font-medium text-gray-800 mt-0.5">
              {item.manager || "—"}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Established Year</span>
            <p className="font-medium text-gray-800 mt-0.5">
              {item.established_year || "—"}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Status</span>
            <div className="mt-0.5">{getStatusBadge(item.status)}</div>
          </div>
          <div className="md:col-span-2">
            <span className="text-sm text-gray-500">Address</span>
            <p className="font-medium text-gray-800 mt-0.5 whitespace-pre-wrap">
              {item.address || "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
