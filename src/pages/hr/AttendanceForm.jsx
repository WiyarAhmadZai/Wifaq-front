import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";

export default function AttendanceForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    date: "",
    employee_id: "",
    status: "present",
    arrived: "",
    check_out: "",
    notes: "",
    left_without_notice: false,
  });

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEmployees();
    if (isEdit) {
      fetchAttendance();
    } else {
      setFormData((prev) => ({
        ...prev,
        date: new Date().toISOString().split("T")[0],
      }));
    }
  }, [id]);

  const fetchEmployees = async () => {
    try {
      const response = await get("/hr/staff/list?per_page=1000");
      const staffData = response.data?.data || response.data || [];
      setEmployees(Array.isArray(staffData) ? staffData : []);
    } catch (error) {
      console.error("Failed to load employees", error);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const response = await get(`/hr/attendances/${id}`);
      const data = response.data;
      setFormData({
        date: data.date || "",
        employee_id: data.employee_id || "",
        status: data.status || "present",
        arrived: data.arrived || "",
        check_out: data.check_out || "",
        notes: data.notes || "",
        left_without_notice: data.left_without_notice || false,
      });
    } catch (error) {
      Swal.fire("Error", "Failed to load attendance data", "error");
      navigate("/hr/attendance");
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (isEdit) {
        await put(`/hr/attendances/${id}`, formData);
        Swal.fire("Success", "Attendance updated successfully", "success");
      } else {
        await post("/hr/attendances", formData);
        Swal.fire("Success", "Attendance recorded successfully", "success");
      }
      navigate("/hr/attendance");
    } catch (error) {
      const message = error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(", ")
        : error.response?.data?.error ||
          error.response?.data?.message ||
          "Failed to save attendance";
      Swal.fire("Error", message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 mx-auto max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/hr/attendance")}
          className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
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
        <div>
          <h2 className="text-lg font-bold text-gray-800">
            {isEdit ? "Edit Attendance" : "Manual Attendance Entry"}
          </h2>
          <p className="text-xs text-gray-500">
            {isEdit ? "Update attendance record" : "Record attendance manually"}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
        autoComplete="off"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Date *
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Employee *
            </label>
            <select
              name="employee_id"
              value={formData.employee_id}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs"
            >
              <option value="">Select Employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.employee_id || "No ID"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs"
            >
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="half_day">Half Day</option>
              <option value="leave">Leave</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Arrived (Time In)
            </label>
            <input
              type="time"
              name="arrived"
              value={formData.arrived}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Check Out (Time Out)
            </label>
            <input
              type="time"
              name="check_out"
              value={formData.check_out}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="left_without_notice"
              checked={formData.left_without_notice}
              onChange={handleChange}
              className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
            />
            <label className="ml-2 text-xs font-medium text-gray-700">
              Left Without Notice
            </label>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs"
            placeholder="Add any additional notes..."
          ></textarea>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => navigate("/hr/attendance")}
            className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : isEdit ? "Update" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
