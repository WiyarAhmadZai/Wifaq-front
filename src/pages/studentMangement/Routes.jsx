import CrudPage from "../../components/CrudPage";

export default function Routes() {
  return (
    <CrudPage
      title="Transportation Routes"
      apiEndpoint="/transportation/routes"
      listColumns={[
        { key: "route_name", label: "Route Name" },
        { key: "fee", label: "Monthly Fee (AFN)" },
        { key: "description", label: "Description" },
        { key: "is_active", label: "Status", render: (val) => val ? "Active" : "Inactive" },
      ]}
      createRoute="/transportation/routes/create"
      editRoute="/transportation/routes/edit"
      showRoute="/transportation/routes/show"
    />
  );
}
