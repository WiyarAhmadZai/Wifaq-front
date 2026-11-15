import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put, peekCache } from "../../api/axios";
import Swal from "sweetalert2";

import { DateField } from "../../components/hr/HrUI";
import Select2 from "../../components/hr/Select2";

const STATUS_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "half_day", label: "Half Day" },
  { value: "leave", label: "Leave" },
];

export default function AttendanceForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    date: "",
    employee_id: "",
    status: "present",
    notes: "",
    left_without_notice: false,
  });

  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetchEmployees();
      fetchAttendance();
    } else {
      setFormData((prev) => ({
        ...prev,
        date: prev.date || new Date().toISOString().split("T")[0],
      }));
    }
  }, [id]);

  // On create, only staff whose attendance has NOT been taken for the chosen
  // date may be selected. The daily sheet marks those rows as "pending".
  useEffect(() => {
    if (isEdit || !formData.date) return;
    fetchPendingEmployees(formData.date);
  }, [formData.date, isEdit]);

  const fetchEmployees = async () => {
    const __cached = peekCache("/hr/staff/list?per_page=1000");
    if (__cached) {
      const staffData = __cached?.data || __cached || [];
      setEmployees(Array.isArray(staffData) ? staffData : []);
    }
    try {
      const response = await get("/hr/staff/list?per_page=1000");
      const staffData = response.data?.data || response.data || [];
      setEmployees(Array.isArray(staffData) ? staffData : []);
    } catch (error) {
      console.error("Failed to load employees", error);
    }
  };

  const applyPendingRows = (rows) => {
    const pending = (rows || [])
      .filter((row) => row.status === "pending" && !row.attendance_id)
      .map((row) => row.employee);
    setEmployees(pending);
    // The staff picked earlier may already have a record for the new date.
    setFormData((prev) =>
      prev.employee_id &&
      !pending.some((emp) => String(emp.id) === String(prev.employee_id))
        ? { ...prev, employee_id: "" }
        : prev,
    );
  };

  const fetchPendingEmployees = async (date) => {
    setEmployeesLoading(true);
    setEmployeesError(null);
    const url = `/hr/attendances/daily-sheet?date=${date}`;
    const __cached = peekCache(url);
    if (__cached) {
      applyPendingRows(__cached.rows);
      setEmployeesLoading(false);
    }
    try {
      const response = await get(url);
      applyPendingRows(response.data?.rows);
    } catch (error) {
      console.error("Failed to load available staff", error);
      setEmployees([]);
      setEmployeesError(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Failed to load the staff list for this date",
      );
    } finally {
      setEmployeesLoading(false);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    const __cached = peekCache(`/hr/attendances/${id}`);
    if (__cached) {
      const data = __cached;
      setFormData({
        date: data.date || "",
        employee_id: data.employee_id || "",
        status: data.status || "present",
        notes: data.notes || "",
        left_without_notice: data.left_without_notice || false,
      });
      setLoading(false);
    }
    try {
      const response = await get(`/hr/attendances/${id}`);
      const data = response.data;
      setFormData({
        date: data.date || "",
        employee_id: data.employee_id || "",
        status: data.status || "present",
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

    if (!formData.employee_id) {
      Swal.fire("Error", "Please select an employee", "error");
      return;
    }

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

  const employeeOptions = employees.map((emp) => ({
    value: emp.id,
    label: `${emp.full_name} (${emp.employee_id || "No ID"})${emp.department ? " · " + emp.department : ""}`,
  }));

  const employeePlaceholder = employeesLoading
    ? "Loading staff…"
    : employeesError
      ? "Staff list unavailable"
      : !isEdit && employeeOptions.length === 0
        ? "All staff already have attendance for this date"
        : "Search by name, employee ID, or department…";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 mx-auto max-w-full">
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

      <div className="mb-4 p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs flex items-start gap-2">
        <svg
          className="w-4 h-4 shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>
          Time In and Time Out are recorded by the system from{" "}
          <button
            type="button"
            onClick={() => navigate("/hr/attendance/quick")}
            className="font-semibold underline hover:text-teal-900"
          >
            Quick Attendance
          </button>
          . This form only records the status for staff whose attendance has not
          been taken yet.
        </span>
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
            <DateField
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              disabled={isEdit}
              className={`w-full px-3 py-2 border rounded-lg text-xs ${isEdit ? "bg-gray-100 border-gray-300 text-gray-600 cursor-not-allowed" : "border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"}`} />
            {isEdit && <p className="text-[10px] text-gray-500 mt-1">Historical dates cannot be modified</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Employee *
            </label>
            <Select2
              value={formData.employee_id}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, employee_id: value || "" }))
              }
              options={employeeOptions}
              placeholder={employeePlaceholder}
              disabled={isEdit || employeesLoading}
              size="sm"
              error={!!employeesError}
            />
            {employeesError ? (
              <p className="text-[10px] text-red-500 mt-1">{employeesError}</p>
            ) : isEdit ? null : (
              <p className="text-[10px] text-gray-500 mt-1">
                Only staff without attendance for this date are listed
                {employeeOptions.length > 0 && ` (${employeeOptions.length})`}.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Status *
            </label>
            <Select2
              value={formData.status}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, status: value || "present" }))
              }
              options={STATUS_OPTIONS}
              placeholder="Select status…"
              isClearable={false}
              size="sm"
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
            disabled={saving || (!isEdit && !formData.employee_id)}
            className="px-4 py-2 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : isEdit ? "Update" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
