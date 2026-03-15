import CrudPage from "../../components/CrudPage";

export default function Branches() {
  return (
    <CrudPage
      title="Branches Management"
      apiEndpoint="/branches/list"
      listColumns={[
        { key: "name", label: "Branch Name" },
        { key: "code", label: "Code" },
        { key: "phone", label: "Phone" },
        { key: "manager", label: "Manager" },
        {
          key: "status",
          label: "Status",
          render: (val) => (val ? "Active" : "Inactive"),
        },
        { key: "established_year", label: "Established Year" },
      ]}
      createRoute="/branches/create"
      editRoute="/branches/edit"
      showRoute="/branches/show"
    />
  );
}
