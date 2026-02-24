import CrudShowPage from '../../components/CrudShowPage';
import { staffTaskFields } from './StaffTask';

export default function StaffTaskShow() {
  return (
    <CrudShowPage
      title="Staff Task"
      apiEndpoint="/hr/staff-tasks"
      fields={staffTaskFields}
      listRoute="/hr/staff-task"
      editRoute="/hr/staff-task/edit"
    />
  );
}
