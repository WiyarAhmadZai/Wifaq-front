import { useState } from "react";
import CrudPage from "../../components/CrudPage";
import { useNavigate } from "react-router-dom";
import WorkCalendarModal from "./WorkCalendarModal";
import { useResourcePermissions } from "../../admin/utils/useResourcePermissions";
import { fmtDate } from "../../utils/formErrors";

export default function Attendance() {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];
  // The work calendar (weekends + closed days) lives behind the holidays
  // permissions, not attendance's — it is the same table payroll reads to
  // decide what a day costs, so editing it is a calendar right, not a
  // sheet-marking one.
  const { canView: canViewCalendar } = useResourcePermissions("holidays");
  const [calendarOpen, setCalendarOpen] = useState(false);

  const formatTime12Hour = (time24) => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // working_hours is stored as a DECIMAL number of hours (e.g. 0.17 = 10 min).
  // Show it in human terms: minutes-only under an hour, "Xh Ym" otherwise.
  const formatDuration = (hoursDecimal) => {
    if (hoursDecimal === null || hoursDecimal === undefined || hoursDecimal === "") return "—";
    const totalMin = Math.round(Number(hoursDecimal) * 60);
    if (isNaN(totalMin) || totalMin <= 0) return "0 min";
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} hr`;
    return `${h}h ${m}m`;
  };

  const extraButtons = (
    <>
      {canViewCalendar && (
        <button
          onClick={() => setCalendarOpen(true)}
          className="px-3 py-1.5 bg-[#0D5C63] text-white rounded-lg hover:bg-teal-800 transition-colors flex items-center gap-1.5 font-medium text-xs"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          Work Calendar
        </button>
      )}
      <button
        onClick={() => navigate("/hr/attendance/quick")}
        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1.5 font-medium text-xs"
      >
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
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Quick Attendance
      </button>
      <button
        onClick={() => navigate("/hr/attendance/report")}
        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 font-medium text-xs"
      >
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
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        Report
      </button>
    </>
  );

  return (
    <>
    <CrudPage
      permissionBase="attendance"
      title="Staff Attendance"
      apiEndpoint={`/hr/attendances?date=${today}`}
      listColumns={[
        // DD/MM/YYYY, the app-wide display format. `fmtDate` reads a bare
        // Y-m-d as a local date, so the day never shifts across timezones.
        { key: "date", label: "Date", render: (val) => fmtDate(val), exportValue: (item) => fmtDate(item.date, "") },
        { key: "employee_id", label: "Employee", render: (_, item) => item.employee?.full_name || item.employee?.application?.full_name || `#${item.employee_id}`, exportValue: (item) => item.employee?.full_name || item.employee_id || '' },
        { key: "status", label: "Status" },
        { key: "arrived", label: "Arrived", render: (val) => formatTime12Hour(val), exportValue: (item) => formatTime12Hour(item.arrived) },
        { key: "check_out", label: "Check Out", render: (val) => formatTime12Hour(val), exportValue: (item) => formatTime12Hour(item.check_out) },
        { key: "working_hours", label: "Working Hours", render: (val) => formatDuration(val), exportValue: (item) => formatDuration(item.working_hours) },
      ]}
      createRoute="/hr/attendance/create"
      editRoute="/hr/attendance/edit"
      showRoute="/hr/attendance/show"
      extraHeaderButtons={extraButtons}
    />
    {calendarOpen && <WorkCalendarModal onClose={() => setCalendarOpen(false)} />}
    </>
  );
}
