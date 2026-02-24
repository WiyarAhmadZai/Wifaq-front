import CrudFormPage from '../../components/CrudFormPage';
import { visitorLogFields } from './VisitorLog';

export default function VisitorLogForm() {
  return (
    <CrudFormPage
      title="Visitor Log"
      apiEndpoint="/hr/visitor-logs"
      fields={visitorLogFields}
      listRoute="/hr/visitor-log"
    />
  );
}
