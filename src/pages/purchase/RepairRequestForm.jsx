import CrudFormPage from "../../components/CrudFormPage";

export default function RepairRequestForm() {
  return (
    <CrudFormPage
      title="Repair Request"
      apiEndpoint="/purchase/repair-requests"
      listRoute="/purchase/repair-requests"
      fields={[
        { name: "title", label: "Title", type: "text", required: true },
        { name: "description", label: "Description", type: "textarea", required: true },
        { name: "requested_by", label: "Requested By", type: "text", required: true },
        { name: "location", label: "Location", type: "text" },
        {
          name: "priority", label: "Priority", type: "select",
          options: [
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
            { value: "urgent", label: "Urgent" },
          ],
        },
        {
          name: "status", label: "Status", type: "select",
          options: [
            { value: "pending", label: "Pending" },
            { value: "in_progress", label: "In Progress" },
            { value: "completed", label: "Completed" },
            { value: "cancelled", label: "Cancelled" },
          ],
        },
        { name: "estimated_cost", label: "Estimated Cost (AFN)", type: "number" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
    />
  );
}
