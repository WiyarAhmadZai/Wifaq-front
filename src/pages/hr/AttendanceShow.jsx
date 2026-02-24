import CrudShowPage from '../../components/CrudShowPage';
import { attendanceFields } from './Attendance';

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
