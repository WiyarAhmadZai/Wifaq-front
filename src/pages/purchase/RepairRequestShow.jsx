import CrudShowPage from "../../components/CrudShowPage";

export default function RepairRequestShow() {
  return (
    <CrudShowPage
      title="Repair Request"
      apiEndpoint="/purchase/repair-requests"
      listRoute="/purchase/repair-requests"
      editRoute="/purchase/repair-requests/edit"
      fields={[
        { name: "title", label: "Title" },
        { name: "description", label: "Description" },
        { name: "requested_by", label: "Requested By" },
        { name: "location", label: "Location" },
        { name: "priority", label: "Priority" },
        { name: "status", label: "Status" },
        { name: "estimated_cost", label: "Estimated Cost (AFN)" },
        { name: "notes", label: "Notes" },
      ]}
    />
  );
}
