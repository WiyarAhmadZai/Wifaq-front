import CrudPage from "../../components/CrudPage";

export default function Branches() {
  return (
    <CrudPage
      title="Branches Management"
      apiEndpoint="/branches/list"
      statusEndpoint="/branches/update"
      deleteEndpoint="/branches/delete"
      statusOptions={[
        { value: "true", label: "Active" },
        { value: "false", label: "Inactive" }
      ]}
      listColumns={[
        { key: "name", label: "Branch Name" },
        { key: "code", label: "Code" },
        { key: "phone", label: "Phone" },
        { key: "manager", label: "Manager" },
        {
          key: "status",
          label: "Status",
          render: (val) => (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              val ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}>
              {val ? "Active" : "Inactive"}
            </span>
          ),
        },
        { key: "established_year", label: "Established Year" },
      ]}
      createRoute="/branches/create"
      editRoute="/branches/edit"
      showRoute="/branches/show"
    />
  );
}
