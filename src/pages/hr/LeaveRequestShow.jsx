import CrudShowPage from '../../components/CrudShowPage';
import { leaveRequestFields } from './LeaveRequest';

export default function LeaveRequestShow() {
  return (
    <CrudShowPage
      title="Leave Request"
      apiEndpoint="/hr/leave-requests"
      fields={leaveRequestFields}
      listRoute="/hr/leave-request"
      editRoute="/hr/leave-request/edit"
    />
  );
}
