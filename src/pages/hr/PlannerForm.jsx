import CrudFormPage from '../../components/CrudFormPage';
import { plannerFields } from './Planner';

export default function PlannerForm() {
  return (
    <CrudFormPage
      title="Planner"
      apiEndpoint="/hr/planners"
      fields={plannerFields}
      listRoute="/hr/planner"
    />
  );
}
