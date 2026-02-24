import CrudFormPage from '../../components/CrudFormPage';
import { purchaseRequestFields } from './PurchaseRequest';

export default function PurchaseRequestForm() {
  return (
    <CrudFormPage
      title="Purchase Request"
      apiEndpoint="/hr/purchase-requests"
      fields={purchaseRequestFields}
      listRoute="/hr/purchase-request"
    />
  );
}
