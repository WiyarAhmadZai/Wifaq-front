import CrudFormPage from '../../components/CrudFormPage';
import { vendorFields } from './AddVendor';

export default function AddVendorForm() {
  return (
    <CrudFormPage
      title="Vendor"
      apiEndpoint="/hr/vendors"
      fields={vendorFields}
      listRoute="/hr/add-vendor"
    />
  );
}
