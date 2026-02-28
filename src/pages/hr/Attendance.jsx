import CrudPage from "../../components/CrudPage";
import { useNavigate } from "react-router-dom";

export default function Attendance() {
  const navigate = useNavigate();

  const extraButtons = (
    <>
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
    <CrudPage
      title="Staff Attendance"
      apiEndpoint="/hr/attendances"
      listColumns={[
        { key: "date", label: "Date" },
        { key: "employee_id", label: "Employee" },
        { key: "status", label: "Status" },
        { key: "arrived", label: "Arrived" },
        { key: "check_out", label: "Check Out" },
        { key: "working_hours", label: "Working Hours" },
      ]}
      createRoute="/hr/attendance/create"
      editRoute="/hr/attendance/edit"
      showRoute="/hr/attendance/show"
      extraHeaderButtons={extraButtons}
    />
  );
}
