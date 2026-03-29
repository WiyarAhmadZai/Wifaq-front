import CrudPage from "../../components/CrudPage";

export default function Suppliers() {
  return (
    <CrudPage
      title="Suppliers"
      apiEndpoint="/purchase/suppliers"
      createRoute="/purchase/suppliers/create"
      editRoute="/purchase/suppliers/edit"
      showRoute="/purchase/suppliers/show"
      searchable
      searchFields={["name", "contact_person", "phone", "email"]}
      statusEndpoint="/purchase/suppliers"
      statusField="status"
      statusOptions={[
        { value: "active", label: "Active", color: "emerald" },
        { value: "inactive", label: "Inactive", color: "gray" },
      ]}
      listColumns={[
        { key: "name", label: "Supplier Name" },
        { key: "contact_person", label: "Contact Person" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        {
          key: "status",
          label: "Status",
          render: (val) => (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
              val === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-gray-50 text-gray-600 border-gray-200"
            }`}>
              {val || "active"}
            </span>
          ),
        },
      ]}
    />
  );
}
