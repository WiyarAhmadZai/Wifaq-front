import CrudPage from "../../components/CrudPage";

export const attendanceFields = [
  { name: "date", label: "Date", type: "date", required: true },
  { name: "day", label: "Day", type: "text", required: true },
  { name: "employee_id", label: "Employee", type: "text", required: true },
  {
    name: "status",
    label: "Status",
    type: "select",
    required: true,
    options: [
      { value: "present", label: "Present" },
      { value: "absent", label: "Absent" },
      { value: "late", label: "Late" },
      { value: "half_day", label: "Half Day" },
      { value: "leave", label: "Leave" },
    ],
  },
  { name: "arrived", label: "Arrived", type: "time" },
  { name: "check_out", label: "Check Out", type: "time" },
  {
    name: "left_without_notice",
    label: "Left Without Notice",
    type: "checkbox",
  },
  { name: "notes", label: "Notes", type: "textarea" },
];

export const attendanceColumns = [
  { key: "date", label: "Date" },
  { key: "employee_id", label: "Employee" },
  { key: "status", label: "Status" },
  { key: "arrived", label: "Arrived" },
];

export default function Attendance() {
  return (
    <CrudPage
      title="Staff Attendance"
      apiEndpoint="/hr/attendances"
      listColumns={attendanceColumns}
      createRoute="/hr/attendance/create"
      editRoute="/hr/attendance/edit"
      showRoute="/hr/attendance/show"
    />
  );
}
