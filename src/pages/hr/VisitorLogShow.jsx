import CrudShowPage from '../../components/CrudShowPage';
import { visitorLogFields } from './VisitorLog';

export default function VisitorLogShow() {
  return (
    <CrudShowPage
      title="Visitor Log"
      apiEndpoint="/hr/visitor-logs"
      fields={visitorLogFields}
      listRoute="/hr/visitor-log"
      editRoute="/hr/visitor-log/edit"
    />
  );
}
