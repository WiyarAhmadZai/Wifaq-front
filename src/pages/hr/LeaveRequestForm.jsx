import CrudFormPage from '../../components/CrudFormPage';
import { leaveRequestFields } from './LeaveRequest';

export default function LeaveRequestForm() {
  return (
    <CrudFormPage
      title="Leave Request"
      apiEndpoint="/hr/leave-requests"
      fields={leaveRequestFields}
      listRoute="/hr/leave-request"
    />
  );
}
