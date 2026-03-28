import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put } from "../../api/axios";
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
  Save: () => (
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
        d="M5 13l4 4L19 7"
      />
    </svg>
  ),
};

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export default function BranchForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    manager: "",
    status: true,
    established_year: "",
    address: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetchBranch();
    }
  }, [id, isEdit]);

  const fetchBranch = async () => {
    setLoading(true);
    try {
      const response = await get(`/branches/show/${id}`);
      if (response.data?.success || response.data) {
        const branchData = response.data?.data || response.data;
        const normalizedStatus =
          branchData.status === true ||
          branchData.status === 1 ||
          branchData.status === "1" ||
          branchData.status === "true";
        setFormData({
          name: branchData.name || "",
          phone: branchData.phone || "",
          manager: branchData.manager || "",
          status: normalizedStatus,
          established_year: branchData.established_year || "",
          address: branchData.address || "",
        });
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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate required fields before sending
      if (!formData.name || formData.name.trim() === '') {
        Swal.fire("Error", "Branch name is required", "error");
        setSubmitting(false);
        return;
      }

      let response;
      
      if (isEdit) {
        // Don't send code field - backend handles it
        response = await put(`/branches/update/${id}`, formData);
      } else {
        // Don't send code field - backend will generate it automatically
        response = await post('/branches/store', formData);
      }

      console.log('API Response:', response);

      if (response.data?.success || response.data) {
        Swal.fire(
          "Success",
          `Branch ${isEdit ? "updated" : "created"} successfully`,
          "success",
        );
        navigate("/branches");
      } else {
        const errorMessage = response.data?.message || "Failed to save branch";
        console.error('API Error:', response.data);
        Swal.fire("Error", errorMessage, "error");
      }
    } catch (error) {
      console.error("Error saving branch:", error);
      console.error("Error response:", error.response);
      
      // Handle different types of errors
      let errorMessage = "Failed to save branch";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        // Handle validation errors
        const errors = error.response.data.errors;
        const firstError = Object.values(errors)[0];
        errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Swal.fire("Error", errorMessage, "error");
    } finally {
      setSubmitting(false);
    }
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

  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/branches")}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Icons.ArrowLeft />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            {isEdit ? "Edit Branch" : "Add New Branch"}
          </h2>
          <p className="text-sm text-gray-500">
            {isEdit ? "Update branch details" : "Create a new school branch"}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branch Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="e.g., Main Branch"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="+93 700 000 000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branch Manager
              </label>
              <input
                type="text"
                name="manager"
                value={formData.manager}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Manager name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Established Year
              </label>
              <input
                type="number"
                name="established_year"
                value={formData.established_year}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="e.g., 2010"
                min="1900"
                max={new Date().getFullYear()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="flex items-center mt-3">
                <input
                  type="checkbox"
                  name="status"
                  checked={formData.status}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="status"
                  className="ml-2 block text-sm text-gray-900"
                >
                  Active
                </label>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Full address"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate("/branches")}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
            >
              <Icons.Save />
              {submitting
                ? isEdit
                  ? "Updating..."
                  : "Creating..."
                : isEdit
                  ? "Update Branch"
                  : "Create Branch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
