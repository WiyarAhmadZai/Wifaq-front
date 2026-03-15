import CrudFormPage from "../../components/CrudFormPage";

export default function SupplierForm() {
  return (
    <CrudFormPage
      title="Supplier"
      apiEndpoint="/purchase/suppliers"
      listRoute="/purchase/suppliers"
      fields={[
        { name: "name", label: "Supplier Name", type: "text", required: true },
        { name: "contact_person", label: "Contact Person", type: "text", required: true },
        { name: "phone", label: "Phone", type: "text", required: true },
        { name: "email", label: "Email", type: "email" },
        { name: "address", label: "Address", type: "textarea" },
        {
          name: "status", label: "Status", type: "select",
          options: [
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ],
        },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
    />
  );
}
