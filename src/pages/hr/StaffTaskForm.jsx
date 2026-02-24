import CrudFormPage from '../../components/CrudFormPage';
import { staffTaskFields } from './StaffTask';

export default function StaffTaskForm() {
  return (
    <CrudFormPage
      title="Staff Task"
      apiEndpoint="/hr/staff-tasks"
      fields={staffTaskFields}
      listRoute="/hr/staff-task"
    />
  );
}
