import CrudShowPage from "../../components/CrudShowPage";

export default function SupplierShow() {
  return (
    <CrudShowPage
      title="Supplier"
      apiEndpoint="/purchase/suppliers/show"
      listRoute="/purchase/suppliers"
      editRoute="/purchase/suppliers/edit"
      fields={[
        { name: "name", label: "Supplier Name" },
        { name: "contact_person", label: "Contact Person" },
        { name: "phone", label: "Phone" },
        { name: "email", label: "Email" },
        { name: "address", label: "Address" },
        { name: "status", label: "Status" },
        { name: "notes", label: "Notes" },
      ]}
    />
  );
}
