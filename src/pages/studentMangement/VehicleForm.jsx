import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";

export default function VehicleForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const formRef = useRef(null);

  const [formData, setFormData] = useState({
    plate_number: "",
    total_seats: "",
    route_id: "",
    driver_name: "",
    driver_contact: "",
    driver_age: "",
    is_active: true,
  });

  const [routes, setRoutes] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRoutes();
    if (isEdit) {
      fetchVehicle();
    }
  }, [id]);

  const fetchRoutes = async () => {
    try {
      const response = await get("/transportation/routes/active/list");
      const data = response.data?.data || response.data || [];
      setRoutes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch routes", error);
    }
  };

  const fetchVehicle = async () => {
    setLoading(true);
    try {
      const response = await get(`/transportation/vehicles/show/${id}`);
      const vehicleData = response.data?.data || response.data;
      setFormData({
        plate_number: vehicleData.plate_number || "",
        total_seats: vehicleData.total_seats || "",
        route_id: vehicleData.route_id || "",
        driver_name: vehicleData.driver_name || "",
        driver_contact: vehicleData.driver_contact || "",
        driver_age: vehicleData.driver_age || "",
        is_active: vehicleData.is_active ?? true,
      });
    } catch (error) {
      Swal.fire("Error", "Failed to load vehicle data", "error");
      navigate("/transportation/vehicles");
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
        await put(`/transportation/vehicles/update/${id}`, formData);
        Swal.fire("Success", "Vehicle updated successfully", "success");
      } else {
        await post("/transportation/vehicles/store", formData);
        Swal.fire("Success", "Vehicle created successfully", "success");
      }
      navigate("/transportation/vehicles");
    } catch (error) {
      if (error.response?.status === 422 && error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        Swal.fire(
          "Error",
          error.response?.data?.message || "Failed to save vehicle",
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
          onClick={() => navigate("/transportation/vehicles")}
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
          {isEdit ? "Edit Vehicle" : "Add Vehicle"}
        </h2>
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Plate Number *
          </label>
          <input
            type="text"
            name="plate_number"
            value={formData.plate_number}
            onChange={handleChange}
            required
            className={getFieldClass("plate_number")}
            placeholder="e.g. KBL-12345"
          />
          {getFieldError("plate_number") && (
            <p className="text-red-500 text-[10px] mt-1">
              {getFieldError("plate_number")}
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Total Seats *
          </label>
          <input
            type="number"
            name="total_seats"
            value={formData.total_seats}
            onChange={handleChange}
            required
            className={getFieldClass("total_seats")}
          />
          {getFieldError("total_seats") && (
            <p className="text-red-500 text-[10px] mt-1">
              {getFieldError("total_seats")}
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Route
          </label>
          <select
            name="route_id"
            value={formData.route_id}
            onChange={handleChange}
            className={getFieldClass("route_id")}
          >
            <option value="">Select Route (Optional)</option>
            {routes.map((route) => (
              <option key={route.id} value={route.id}>
                {route.route_name}
              </option>
            ))}
          </select>
          {getFieldError("route_id") && (
            <p className="text-red-500 text-[10px] mt-1">
              {getFieldError("route_id")}
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Driver Name *
          </label>
          <input
            type="text"
            name="driver_name"
            value={formData.driver_name}
            onChange={handleChange}
            required
            className={getFieldClass("driver_name")}
          />
          {getFieldError("driver_name") && (
            <p className="text-red-500 text-[10px] mt-1">
              {getFieldError("driver_name")}
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Driver Contact
          </label>
          <input
            type="text"
            name="driver_contact"
            value={formData.driver_contact}
            onChange={handleChange}
            className={getFieldClass("driver_contact")}
          />
          {getFieldError("driver_contact") && (
            <p className="text-red-500 text-[10px] mt-1">
              {getFieldError("driver_contact")}
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Driver Age
          </label>
          <input
            type="number"
            name="driver_age"
            value={formData.driver_age}
            onChange={handleChange}
            className={getFieldClass("driver_age")}
          />
        </div>
        <div className="md:col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            name="is_active"
            id="is_active_veh"
            checked={formData.is_active}
            onChange={handleChange}
            className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
          />
          <label
            htmlFor="is_active_veh"
            className="text-xs font-medium text-gray-700"
          >
            Is Active
          </label>
        </div>
        <div className="md:col-span-2 flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={() => navigate("/transportation/vehicles")}
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
