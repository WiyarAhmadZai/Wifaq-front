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
      const payload = {
        date: selectedDate,
        employee_id: row.employee.id,
        status: "present",
        arrived: row.arrived || "09:00",
        check_out: row.check_out || "18:00",
      };
      if (row.attendance_id) {
        await put(`/hr/attendances/${row.attendance_id}`, payload);
      } else {
        await post("/hr/attendances", payload);
      }
      await fetchDailySheet();
    } catch (error) {
      const msg =
        error.response?.data?.error ||
        error.response?.data?.errors?.date?.[0] ||
        "Failed to mark present";
      Swal.fire("Error", msg, "error");
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
    } finally {
      setActionLoading(null);
    }
  };

  const handleTimeChange = async (row, field, value) => {
    if (
      row.status !== "present" &&
      row.status !== "late" &&
      row.status !== "half_day"
    )
      return;
    const key = `time-${row.employee.id}-${field}`;
    setActionLoading(key);
    try {
      const arrived = field === "arrived" ? value : row.arrived;
      const check_out = field === "check_out" ? value : row.check_out;
      await put(`/hr/attendances/${row.attendance_id}`, {
        date: selectedDate,
        employee_id: row.employee.id,
        status: row.status,
        arrived: arrived || null,
        check_out: check_out || null,
      });
      await fetchDailySheet();
    } catch (error) {
      Swal.fire("Error", "Failed to update time", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const getRowBg = (status) => {
    if (status === "present" || status === "late" || status === "half_day")
      return "bg-green-50/50 dark:bg-green-900/10";
    if (status === "absent" || status === "leave")
      return "bg-red-50/50 dark:bg-red-900/10";
    return "";
  };

  const getStatusBadge = (status) => {
    const map = {
      present:
        "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
      absent: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
      late: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
      half_day:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
      leave:
        "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
      pending:
        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    };
    const label = status
      ? status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "Pending";
    return (
      <span
        className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${map[status] || map.pending}`}
      >
        {label}
      </span>
    );
  };

  const isPending = (status) => status === "pending";
  const isPresentLike = (status) =>
    status === "present" || status === "late" || status === "half_day";

  return (
    <div className="px-4 py-6 mx-auto max-w-6xl">
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
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-teal-600 border-t-transparent" />
        </div>
      ) : !dailySheet?.rows?.length ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-500">
          No staff found. Add staff first.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 w-16">
                    #
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 min-w-[200px]">
                    Employee Name
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Department
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Time In
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Time Out
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 text-center">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {dailySheet.rows.map((row) => (
                  <tr
                    key={row.employee.id}
                    className={`border-b border-slate-100 dark:border-slate-700/50 transition-colors ${getRowBg(row.status)} hover:bg-slate-50/50 dark:hover:bg-slate-800/30`}
                  >
                    <td className="px-6 py-5 text-sm font-medium text-slate-500 dark:text-slate-400">
                      {String(row.index).padStart(2, "0")}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold text-xs">
                          {row.employee.initials}
                        </div>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {row.employee.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-400">
                      {row.employee.department || "—"}
                    </td>
                    <td className="px-6 py-5">{getStatusBadge(row.status)}</td>
                    <td className="px-6 py-5">
                      <input
                        type="time"
                        value={row.arrived || ""}
                        onBlur={(e) => {
                          if (
                            row.attendance_id &&
                            isPresentLike(row.status) &&
                            e.target.value
                          )
                            handleTimeChange(row, "arrived", e.target.value);
                        }}
                        disabled={
                          !row.attendance_id || !isPresentLike(row.status)
                        }
                        className={`w-28 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                          row.attendance_id && isPresentLike(row.status)
                            ? "bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600"
                            : "bg-slate-100 dark:bg-slate-800/50 border border-transparent text-slate-400 cursor-not-allowed"
                        }`}
                      />
                    </td>
                    <td className="px-6 py-5">
                      <input
                        type="time"
                        value={row.check_out || ""}
                        onBlur={(e) => {
                          if (
                            row.attendance_id &&
                            isPresentLike(row.status) &&
                            e.target.value
                          )
                            handleTimeChange(row, "check_out", e.target.value);
                        }}
                        disabled={
                          !row.attendance_id || !isPresentLike(row.status)
                        }
                        className={`w-28 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                          row.attendance_id && isPresentLike(row.status)
                            ? "bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600"
                            : "bg-slate-100 dark:bg-slate-800/50 border border-transparent text-slate-400 cursor-not-allowed"
                        }`}
                      />
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleMarkPresent(row)}
                          disabled={actionLoading != null}
                          title="Mark Present"
                          className={`size-8 rounded-lg flex items-center justify-center shadow-sm transition-colors ${
                            isPresentLike(row.status)
                              ? "bg-green-500 text-white hover:bg-green-600"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-500 hover:bg-green-500 hover:text-white"
                          }`}
                        >
                          {actionLoading === `present-${row.employee.id}` ? (
                            <span className="animate-spin size-4 border-2 border-white border-t-transparent rounded-full" />
                          ) : (
                            <svg
                              className="size-5"
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
                          onClick={() => handleMarkAbsent(row)}
                          disabled={actionLoading != null}
                          title="Mark Absent"
                          className={`size-8 rounded-lg flex items-center justify-center shadow-sm transition-colors ${
                            row.status === "absent" || row.status === "leave"
                              ? "bg-red-500 text-white hover:bg-red-600"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-500 hover:bg-red-500 hover:text-white"
                          }`}
                        >
                          {actionLoading === `absent-${row.employee.id}` ? (
                            <span className="animate-spin size-4 border-2 border-white border-t-transparent rounded-full" />
                          ) : (
                            <svg
                              className="size-5"
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {actionLoading && actionLoading.startsWith("time-") && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 flex items-center gap-2 shadow-lg">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-teal-600 border-t-transparent" />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Updating...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
