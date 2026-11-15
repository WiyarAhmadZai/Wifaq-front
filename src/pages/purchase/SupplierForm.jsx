import CrudFormPage from "../../components/CrudFormPage";

export default function SupplierForm() {
  return (
    <CrudFormPage
      title="Supplier"
      apiEndpoint="/purchase/suppliers/show"
      storeEndpoint="/purchase/suppliers/store"
      editEndpoint="/purchase/suppliers/edit"
      listRoute="/purchase/suppliers"
      fields={[
        // Required basics — enough to call/identify the supplier.
        { name: "name",           label: "Full name / Company",        type: "text", required: true },
        { name: "phone",          label: "Phone",                      type: "text", required: true },
        // Optional context — richer details when the supplier provides them.
        { name: "contact_person", label: "Contact person (optional)",  type: "text" },
        { name: "email",          label: "Email (optional)",           type: "email" },
        { name: "address",        label: "Address (optional)",         type: "textarea" },
        { name: "notes",          label: "Notes",                      type: "textarea" },
      ]}
    />
  );
}
