import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get, post } from "../../api/axios";
import Swal from "sweetalert2";

export default function QuickAttendance() {
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState("");
  const [employees, setEmployees] = useState([]);
  const [todayStatus, setTodayStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch employees list
  useEffect(() => {
    fetchEmployees();
  }, []);

  // Fetch today's status when employee changes
  useEffect(() => {
    if (employeeId) {
      fetchTodayStatus();
    }
  }, [employeeId]);

  const fetchEmployees = async () => {
    try {
      const response = await get("/hr/staff/list?per_page=1000");
      const staffData = response.data?.data || response.data || [];
      setEmployees(Array.isArray(staffData) ? staffData : []);
    } catch (error) {
      console.error("Failed to load employees", error);
    }
  };

  const fetchTodayStatus = async () => {
    try {
      const response = await get(
        `/hr/attendances/today-status?employee_id=${employeeId}`,
      );
      setTodayStatus(response.data);
    } catch (error) {
      console.error("Failed to load today's status", error);
    }
  };

  const handleCheckIn = async () => {
    if (!employeeId) {
      Swal.fire("Error", "Please select an employee", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await post("/hr/attendances/check-in", {
        employee_id: employeeId,
      });
      Swal.fire("Success", response.data.message, "success");
      fetchTodayStatus();
    } catch (error) {
      const message = error.response?.data?.error || "Failed to check in";
      Swal.fire("Error", message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!employeeId) {
      Swal.fire("Error", "Please select an employee", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await post("/hr/attendances/check-out", {
        employee_id: employeeId,
      });
      Swal.fire(
        "Success",
        `Check-out successful! Working hours: ${response.data.working_hours}h`,
        "success",
      );
      fetchTodayStatus();
    } catch (error) {
      const message = error.response?.data?.error || "Failed to check out";
      Swal.fire("Error", message, "error");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const selectedEmployee = employees.find((e) => e.id === parseInt(employeeId));

  return (
    <div className="px-4 py-6 mx-auto">
      {/* Back Button */}
      <div className="mb-4">
        <button
          onClick={() => navigate("/hr/attendance")}
          className="flex items-center gap-2 text-gray-600 hover:text-teal-600 transition-colors font-medium text-sm"
        >
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
          Back to Attendance List
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Quick Attendance</h2>
        <p className="text-sm text-gray-500 mt-1">
          One-click check-in and check-out
        </p>
      </div>

      {/* Current Date & Time */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl shadow-lg p-6 mb-6 text-white">
        <div className="text-center">
          <div className="text-4xl font-bold mb-2">
            {formatTime(currentTime)}
          </div>
          <div className="text-teal-100">{formatDate(currentTime)}</div>
        </div>
      </div>

      {/* Employee Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Employee *
        </label>
        <select
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
        >
          <option value="">-- Select Employee --</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.full_name} ({employee.employee_id || "No ID"})
            </option>
          ))}
        </select>
      </div>

      {/* Today's Status */}
      {todayStatus && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Today's Status
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div
              className={`p-4 rounded-lg ${todayStatus.has_check_in ? "bg-emerald-50 border border-emerald-200" : "bg-gray-50 border border-gray-200"}`}
            >
              <div className="text-sm text-gray-500 mb-1">Check-In</div>
              <div
                className={`text-lg font-semibold ${todayStatus.has_check_in ? "text-emerald-600" : "text-gray-400"}`}
              >
                {todayStatus.has_check_in
                  ? todayStatus.attendance?.arrived
                  : "Not checked in"}
              </div>
            </div>
            <div
              className={`p-4 rounded-lg ${todayStatus.has_check_out ? "bg-emerald-50 border border-emerald-200" : "bg-gray-50 border border-gray-200"}`}
            >
              <div className="text-sm text-gray-500 mb-1">Check-Out</div>
              <div
                className={`text-lg font-semibold ${todayStatus.has_check_out ? "text-emerald-600" : "text-gray-400"}`}
              >
                {todayStatus.has_check_out
                  ? todayStatus.attendance?.check_out
                  : "Not checked out"}
              </div>
            </div>
          </div>
          {todayStatus.attendance?.working_hours && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-600 mb-1">
                Working Hours Today
              </div>
              <div className="text-2xl font-bold text-blue-700">
                {todayStatus.attendance.working_hours} hours
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={handleCheckIn}
          disabled={loading || !employeeId || todayStatus?.has_check_in}
          className={`p-4 rounded-xl font-semibold text-white transition-all ${
            todayStatus?.has_check_in
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-emerald-500 hover:bg-emerald-600 shadow-lg hover:shadow-xl"
          }`}
        >
          <div className="flex flex-col items-center">
            <svg
              className="w-8 h-8 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
              />
            </svg>
            <span>Check In</span>
            {todayStatus?.has_check_in && (
              <span className="text-xs font-normal mt-1">
                Already checked in
              </span>
            )}
          </div>
        </button>

        <button
          onClick={handleCheckOut}
          disabled={
            loading ||
            !employeeId ||
            !todayStatus?.has_check_in ||
            todayStatus?.has_check_out
          }
          className={`p-4 rounded-xl font-semibold text-white transition-all ${
            !todayStatus?.has_check_in || todayStatus?.has_check_out
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-orange-500 hover:bg-orange-600 shadow-lg hover:shadow-xl"
          }`}
        >
          <div className="flex flex-col items-center">
            <svg
              className="w-8 h-8 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span>Check Out</span>
            {todayStatus?.has_check_out && (
              <span className="text-xs font-normal mt-1">
                Already checked out
              </span>
            )}
            {!todayStatus?.has_check_in && !todayStatus?.has_check_out && (
              <span className="text-xs font-normal mt-1">Check in first</span>
            )}
          </div>
        </button>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
            <span className="text-gray-700">Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
}
