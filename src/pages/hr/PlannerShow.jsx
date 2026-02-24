import CrudShowPage from '../../components/CrudShowPage';
import { plannerFields } from './Planner';

export default function PlannerShow() {
  return (
    <CrudShowPage
      title="Planner"
      apiEndpoint="/hr/planners"
      fields={plannerFields}
      listRoute="/hr/planner"
      editRoute="/hr/planner/edit"
    />
  );
}
