import CrudFormPage from '../../components/CrudFormPage';
import { attendanceFields } from './Attendance';

export default function AttendanceForm() {
  return (
    <CrudFormPage
      title="Attendance"
      apiEndpoint="/hr/attendances"
      fields={attendanceFields}
      listRoute="/hr/attendance"
    />
  );
}
