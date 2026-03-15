import CrudShowPage from "../../components/CrudShowPage";

const attendanceFields = [
  { name: "date", label: "Date" },
  { name: "employee_id", label: "Employee" },
  { name: "status", label: "Status" },
  { name: "arrived", label: "Arrived" },
  { name: "check_out", label: "Check Out" },
  { name: "working_hours", label: "Working Hours" },
  { name: "notes", label: "Notes" },
];

export default function AttendanceShow() {
  return (
    <CrudShowPage
      title="Attendance"
      apiEndpoint="/hr/attendances"
      fields={attendanceFields}
      listRoute="/hr/attendance"
      editRoute="/hr/attendance/edit"
    />
  );
}
