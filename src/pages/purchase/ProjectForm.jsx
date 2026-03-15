import CrudFormPage from "../../components/CrudFormPage";

export default function ProjectForm() {
  return (
    <CrudFormPage
      title="Project"
      apiEndpoint="/purchase/projects"
      listRoute="/purchase/projects"
      fields={[
        { name: "name", label: "Project Name", type: "text", required: true },
        { name: "description", label: "Description", type: "textarea" },
        { name: "manager", label: "Project Manager", type: "text", required: true },
        { name: "budget", label: "Budget (AFN)", type: "number" },
        { name: "start_date", label: "Start Date", type: "date", required: true },
        { name: "end_date", label: "End Date", type: "date" },
        {
          name: "status", label: "Status", type: "select",
          options: [
            { value: "planning", label: "Planning" },
            { value: "active", label: "Active" },
            { value: "on_hold", label: "On Hold" },
            { value: "completed", label: "Completed" },
            { value: "cancelled", label: "Cancelled" },
          ],
        },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
    />
  );
}
