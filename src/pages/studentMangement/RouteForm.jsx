import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";
import { handleValidationErrors } from "../../utils/formErrors";

export default function RouteForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const formRef = useRef(null);

  const [formData, setFormData] = useState({
    route_name: "",
    description: "",
    is_active: true,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetchRoute();
    }
  }, [id]);

  const fetchRoute = async () => {
    setLoading(true);
    try {
      const response = await get(`/transportation/routes/show/${id}`);
      const routeData = response.data?.data || response.data;
      setFormData({
        route_name: routeData.route_name || "",
        description: routeData.description || "",
        is_active: routeData.is_active ?? true,
      });
    } catch (error) {
      Swal.fire("Error", "Failed to load route data", "error");
      navigate("/transportation/routes");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      if (isEdit) {
        await put(`/transportation/routes/update/${id}`, formData);
        Swal.fire("Success", "Route updated successfully", "success");
      } else {
        await post("/transportation/routes/store", formData);
        Swal.fire("Success", "Route created successfully", "success");
      }
      navigate("/transportation/routes");
    } catch (error) {
      if (!handleValidationErrors(error.response, setErrors)) {
        Swal.fire(
          "Error",
          error.response?.data?.message || "Failed to save route",
          "error",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const getFieldError = (fieldName) => errors[fieldName]?.[0];

  const getFieldClass = (fieldName) => {
    const baseClass = "w-full px-3 py-2 border rounded-lg focus:ring-2 text-xs";
    return `${baseClass} ${getFieldError(fieldName) ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-teal-500"}`;
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="px-4 py-4 mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/transportation/routes")}
          className="p-2 text-gray-500 hover:text-teal-600"
        >
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
        </button>
        <h2 className="text-lg font-bold text-gray-800">
          {isEdit ? "Edit Route" : "Add Route"}
        </h2>
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Route Name *
          </label>
          <input
            type="text"
            name="route_name"
            value={formData.route_name}
            onChange={handleChange}
            required
            className={getFieldClass("route_name")}
            placeholder="e.g. Area A to School"
          />
          {getFieldError("route_name") && (
            <p className="text-red-500 text-[10px] mt-1">
              {getFieldError("route_name")}
            </p>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className={getFieldClass("description")}
            rows="3"
          />
        </div>
        <div className="md:col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            name="is_active"
            id="is_active"
            checked={formData.is_active}
            onChange={handleChange}
            className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
          />
          <label
            htmlFor="is_active"
            className="text-xs font-medium text-gray-700"
          >
            Is Active
          </label>
        </div>
        <div className="md:col-span-2 flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={() => navigate("/transportation/routes")}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium disabled:opacity-50"
          >
            {saving ? "Saving..." : isEdit ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
