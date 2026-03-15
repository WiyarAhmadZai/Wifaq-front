import CrudShowPage from "../../components/CrudShowPage";

export default function ProjectShow() {
  return (
    <CrudShowPage
      title="Project"
      apiEndpoint="/purchase/projects"
      listRoute="/purchase/projects"
      editRoute="/purchase/projects/edit"
      fields={[
        { name: "name", label: "Project Name" },
        { name: "description", label: "Description" },
        { name: "manager", label: "Project Manager" },
        { name: "budget", label: "Budget (AFN)" },
        { name: "start_date", label: "Start Date", type: "date" },
        { name: "end_date", label: "End Date", type: "date" },
        { name: "status", label: "Status" },
        { name: "notes", label: "Notes" },
      ]}
    />
  );
}
