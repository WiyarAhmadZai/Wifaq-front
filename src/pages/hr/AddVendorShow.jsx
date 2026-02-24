import CrudShowPage from '../../components/CrudShowPage';
import { vendorFields } from './AddVendor';

export default function AddVendorShow() {
  return (
    <CrudShowPage
      title="Vendor"
      apiEndpoint="/hr/vendors"
      fields={vendorFields}
      listRoute="/hr/add-vendor"
      editRoute="/hr/add-vendor/edit"
    />
  );
}
