import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";

export default function QuickAttendance() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [dailySheet, setDailySheet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // employee_id or "row-id" when updating

  useEffect(() => {
    fetchDailySheet();
  }, [selectedDate]);

  const fetchDailySheet = async () => {
    setLoading(true);
    try {
      const response = await get(
        `/hr/attendances/daily-sheet?date=${selectedDate}`,
      );
      setDailySheet(response.data);
    } catch (error) {
      console.error("Failed to load daily sheet", error);
      Swal.fire("Error", "Failed to load attendance sheet", "error");
      setDailySheet(null);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPresent = async (row) => {
    const key = `present-${row.employee.id}`;
    setActionLoading(key);
    try {
      const today = new Date().toISOString().slice(0, 10);
      if (selectedDate !== today) {
        Swal.fire(
          "Info",
          "Quick present can only set time for today. Use the attendance form for past days.",
          "info",
        );
      } else {
        // Use backend quick check-in so Time In is taken automatically by the system
        await post("/hr/attendances/check-in", {
          employee_id: row.employee.id,
        });
      }
      await fetchDailySheet();
    } catch (error) {
      const msg =
        error.response?.data?.error ||
        error.response?.data?.errors?.employee_id?.[0] ||
        "Failed to mark present";
      Swal.fire("Error", msg, "error");
      if (error.response?.status === 403) fetchDailySheet();
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckOut = async (row) => {
    const key = `checkout-${row.employee.id}`;
    setActionLoading(key);
    try {
      const today = new Date().toISOString().slice(0, 10);
      if (selectedDate !== today) {
        Swal.fire(
          "Info",
          "Quick check-out is only for today. Use the attendance form for past days.",
          "info",
        );
      } else {
        await post("/hr/attendances/check-out", {
          employee_id: row.employee.id,
        });
        Swal.fire(
          "Success",
          "Check-out recorded. Time Out set by system.",
          "success",
        );
      }
      await fetchDailySheet();
    } catch (error) {
      const msg =
        error.response?.data?.error ||
        error.response?.data?.errors?.employee_id?.[0] ||
        "Failed to record check-out";
      Swal.fire("Error", msg, "error");
      if (error.response?.status === 403) fetchDailySheet();
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAbsent = async (row) => {
    const key = `absent-${row.employee.id}`;
    setActionLoading(key);
    try {
      const payload = {
        date: selectedDate,
        employee_id: row.employee.id,
        status: "absent",
        arrived: null,
        check_out: null,
      };
      if (row.attendance_id) {
        await put(`/hr/attendances/${row.attendance_id}`, payload);
      } else {
        await post("/hr/attendances", {
          date: selectedDate,
          employee_id: row.employee.id,
          status: "absent",
        });
      }
      await fetchDailySheet();
    } catch (error) {
      const msg =
        error.response?.data?.error ||
        error.response?.data?.errors?.date?.[0] ||
        "Failed to mark absent";
      Swal.fire("Error", msg, "error");
      if (error.response?.status === 403) fetchDailySheet();
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      present: "bg-emerald-100 text-emerald-700",
      absent: "bg-red-100 text-red-700",
      late: "bg-amber-100 text-amber-700",
      half_day: "bg-blue-100 text-blue-700",
      leave: "bg-purple-100 text-purple-700",
      pending: "bg-gray-100 text-gray-500",
    };
    const style = styles[status] || styles.pending;
    const label = status ? status.replace("_", " ").toUpperCase() : "PENDING";
    return (
      <span
        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${style}`}
      >
        {label}
      </span>
    );
  };

  const today = new Date().toISOString().slice(0, 10);
  const isPending = (status) => status === "pending";
  const isPresentLike = (status) =>
    status === "present" || status === "late" || status === "half_day";
  const canCheckOut = (row) =>
    selectedDate === today &&
    isPresentLike(row.status) &&
    row.arrived &&
    !row.check_out;
  const quickLimitReached = dailySheet?.quick_limit_reached === true;
  // Once this staff has both Time In and Time Out, no more changes allowed for that staff
  const isRowLocked = (row) => !!(row.arrived && row.check_out);

  return (
    <div className="px-4 py-6 mx-auto">
      <div className="mb-4">
        <button
          onClick={() => navigate("/hr/attendance")}
          className="flex items-center gap-2 text-slate-600 hover:text-teal-600 transition-colors font-medium text-sm"
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

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-black">Quick Attendance</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Mark present/absent for the day. No record ={" "}
            <strong>Pending</strong> (not absent).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-black bg-white">
            Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
      </div>

      {quickLimitReached && (
        <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-2">
          <svg
            className="w-5 h-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>
            You have already completed one check-in and check-out for this date.
            You do not have permission to make further changes on this page.
          </span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent"></div>
          <p className="mt-2 text-gray-500 text-xs">Loading...</p>
        </div>
      ) : !dailySheet?.rows?.length ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <svg
            className="w-10 h-10 mx-auto text-gray-300 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-gray-500 text-xs">No staff found</p>
          <p className="text-gray-400 text-[10px] mt-1">Add staff first</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-teal-50">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider w-16">
                    #
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider min-w-[200px]">
                    Employee Name
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">
                    Time In
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase tracking-wider">
                    Time Out
                  </th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-teal-800 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dailySheet.rows.map((row) => (
                  <tr key={row.employee.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs font-medium text-teal-600">
                      #{String(row.index).padStart(4, "0")}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold text-[10px]">
                          {row.employee.initials}
                        </div>
                        <span className="text-xs text-gray-800">
                          {row.employee.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-800">
                      {row.employee.department || "—"}
                    </td>
                    <td className="px-3 py-2">{getStatusBadge(row.status)}</td>
                    <td className="px-3 py-2">
                      <input
                        type="time"
                        value={row.arrived || ""}
                        disabled
                        readOnly
                        className="w-20 rounded px-1 py-0.5 text-[10px] bg-gray-100 border border-transparent text-gray-500 cursor-not-allowed"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="time"
                        value={row.check_out || ""}
                        disabled
                        readOnly
                        className="w-20 rounded px-1 py-0.5 text-[10px] bg-gray-100 border border-transparent text-gray-500 cursor-not-allowed"
                      />
                    </td>
                    <td className="px-3 py-2">
                      {isRowLocked(row) ? (
                        <p className="text-xs text-center text-slate-500 italic">
                          Completed
                        </p>
                      ) : (
                        <div className="flex justify-center items-center gap-1 flex-wrap">
                          <button
                            onClick={() => handleMarkPresent(row)}
                            disabled={
                              actionLoading != null || quickLimitReached
                            }
                            title="Mark Present (Time In by system)"
                            className={`p-1 rounded transition-colors ${
                              isPresentLike(row.status)
                                ? "bg-green-500 text-white hover:bg-green-600"
                                : "bg-gray-100 text-gray-500 hover:bg-green-500 hover:text-white"
                            }`}
                          >
                            {actionLoading === `present-${row.employee.id}` ? (
                              <span className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                            ) : (
                              <svg
                                className="w-3.5 h-3.5"
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
                            )}
                          </button>
                          <button
                            onClick={() => handleCheckOut(row)}
                            disabled={
                              actionLoading != null ||
                              !canCheckOut(row) ||
                              quickLimitReached
                            }
                            title="Time Out (recorded by system)"
                            className={`p-1 rounded transition-colors ${
                              canCheckOut(row)
                                ? "bg-orange-500 text-white hover:bg-orange-600"
                                : "bg-gray-100 text-gray-400 cursor-not-allowed"
                            }`}
                          >
                            {actionLoading === `checkout-${row.employee.id}` ? (
                              <span className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                            ) : (
                              <svg
                                className="w-3.5 h-3.5"
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
                            )}
                          </button>
                          <button
                            onClick={() => handleMarkAbsent(row)}
                            disabled={
                              actionLoading != null || quickLimitReached
                            }
                            title="Mark Absent"
                            className={`p-1 rounded transition-colors ${
                              row.status === "absent" || row.status === "leave"
                                ? "bg-red-500 text-white hover:bg-red-600"
                                : "bg-gray-100 text-gray-500 hover:bg-red-500 hover:text-white"
                            }`}
                          >
                            {actionLoading === `absent-${row.employee.id}` ? (
                              <span className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                            ) : (
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
