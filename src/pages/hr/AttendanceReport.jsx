import { useState, useEffect } from "react";
import { get } from "../../api/axios";
import Swal from "sweetalert2";

export default function AttendanceReport() {
  const [employees, setEmployees] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    from_date: "",
    to_date: "",
    employee_id: "",
  });

  useEffect(() => {
    fetchEmployees();
    // Set default date range (current month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setFilters({
      from_date: firstDay.toISOString().split("T")[0],
      to_date: today.toISOString().split("T")[0],
      employee_id: "",
    });
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await get("/hr/staff/list?per_page=1000");
      const staffData = response.data?.data || response.data || [];
      setEmployees(Array.isArray(staffData) ? staffData : []);
    } catch (error) {
      console.error("Failed to load employees", error);
    }
  };

  const generateReport = async () => {
    if (!filters.from_date || !filters.to_date) {
      Swal.fire("Error", "Please select date range", "error");
      return;
    }

    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("from_date", filters.from_date);
      queryParams.append("to_date", filters.to_date);
      if (filters.employee_id) {
        queryParams.append("employee_id", filters.employee_id);
      }

      const response = await get(`/hr/attendances/report?${queryParams.toString()}`);
      setReportData(response.data);
    } catch (error) {
      console.error("Failed to generate report", error);
      Swal.fire("Error", "Failed to generate report", "error");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!reportData || !reportData.attendances.length) {
      Swal.fire("Error", "No data to export", "error");
      return;
    }

    const headers = ["Date", "Employee", "Status", "Arrived", "Check Out", "Working Hours", "Notes"];
    const rows = reportData.attendances.map((item) => [
      item.date,
      item.employee?.full_name || "-",
      item.status,
      item.arrived || "-",
      item.check_out || "-",
      item.working_hours || "-",
      item.notes || "-",
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_report_${filters.from_date}_to_${filters.to_date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Swal.fire("Success", "Report exported successfully", "success");
  };

  const getStatusBadge = (status) => {
    const styles = {
      present: "bg-emerald-100 text-emerald-700",
      absent: "bg-red-100 text-red-700",
      late: "bg-amber-100 text-amber-700",
      half_day: "bg-blue-100 text-blue-700",
      leave: "bg-purple-100 text-purple-700",
    };
    return styles[status] || "bg-gray-100 text-gray-700";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="px-4 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Attendance Report</h2>
          <p className="text-sm text-gray-500 mt-0.5">Generate and export attendance reports</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date *</label>
            <input
              type="date"
              value={filters.from_date}
              onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date *</label>
            <input
              type="date"
              value={filters.to_date}
              onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Employee (Optional)</label>
            <select
              value={filters.employee_id}
              onChange={(e) => setFilters({ ...filters, employee_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={generateReport}
            disabled={loading}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Report"}
          </button>
          {reportData && (
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export to CSV
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {reportData?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-500">Total Days</div>
            <div className="text-2xl font-bold text-gray-800">{reportData.summary.total_days}</div>
          </div>
          <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-4">
            <div className="text-sm text-emerald-600">Present</div>
            <div className="text-2xl font-bold text-emerald-700">{reportData.summary.present}</div>
          </div>
          <div className="bg-red-50 rounded-lg border border-red-200 p-4">
            <div className="text-sm text-red-600">Absent</div>
            <div className="text-2xl font-bold text-red-700">{reportData.summary.absent}</div>
          </div>
          <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
            <div className="text-sm text-amber-600">Late</div>
            <div className="text-2xl font-bold text-amber-700">{reportData.summary.late}</div>
          </div>
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <div className="text-sm text-blue-600">Half Day</div>
            <div className="text-2xl font-bold text-blue-700">{reportData.summary.half_day}</div>
          </div>
          <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
            <div className="text-sm text-purple-600">Leave</div>
            <div className="text-2xl font-bold text-purple-700">{reportData.summary.leave}</div>
          </div>
          <div className="bg-teal-50 rounded-lg border border-teal-200 p-4">
            <div className="text-sm text-teal-600">Total Hours</div>
            <div className="text-2xl font-bold text-teal-700">{reportData.summary.total_working_hours?.toFixed(2) || 0}</div>
          </div>
        </div>
      )}

      {/* Report Table */}
      {reportData && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Detailed Report</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Arrived</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Check Out</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Working Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reportData.attendances.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                      No attendance records found for the selected period
                    </td>
                  </tr>
                ) : (
                  reportData.attendances.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(item.date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-800 font-medium">{item.employee?.full_name || "-"}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}>
                          {item.status?.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.arrived || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.check_out || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                        {item.working_hours ? `${item.working_hours}h` : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
