import CrudShowPage from '../../components/CrudShowPage';
import { purchaseRequestFields } from './PurchaseRequest';

export default function PurchaseRequestShow() {
  return (
    <CrudShowPage
      title="Purchase Request"
      apiEndpoint="/hr/purchase-requests"
      fields={purchaseRequestFields}
      listRoute="/hr/purchase-request"
      editRoute="/hr/purchase-request/edit"
    />
  );
}
