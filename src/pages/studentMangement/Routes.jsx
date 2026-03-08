import CrudPage from "../../components/CrudPage";

export default function Routes() {
  return (
    <CrudPage
      title="Transportation Routes"
      apiEndpoint="/transportation/routes/list"
      searchable={true}
      searchFields={["route_name", "description"]}
      listColumns={[
        { key: "route_name", label: "Route Name" },
        {
          key: "fee",
          label: "Monthly Fee",
          render: (val) => (val ? `$${parseFloat(val).toFixed(2)}` : "—"),
        },
        { key: "description", label: "Description" },
        {
          key: "is_active",
          label: "Status",
          render: (val) => (val ? "Active" : "Inactive"),
        },
      ]}
      createRoute="/transportation/routes/create"
      editRoute="/transportation/routes/edit"
      showRoute="/transportation/routes/show"
    />
  );
}
