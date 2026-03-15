import CrudPage from "../../components/CrudPage";

export default function Vehicles() {
  return (
    <CrudPage
      title="Vehicles Management"
      apiEndpoint="/transportation/vehicles/list"
      searchable={true}
      searchFields={["plate_number", "driver_name", "driver_contact"]}
      listColumns={[
        { key: "plate_number", label: "Plate Number" },
        {
          key: "route",
          label: "Route",
          render: (val) => val?.route_name || "—",
        },
        { key: "driver_name", label: "Driver Name" },
        { key: "driver_contact", label: "Driver Contact" },
        { key: "total_seats", label: "Total Seats" },
        { key: "available_seat", label: "Available" },
        {
          key: "is_active",
          label: "Status",
          render: (val) => (val ? "Active" : "Inactive"),
        },
      ]}
      createRoute="/transportation/vehicles/create"
      editRoute="/transportation/vehicles/edit"
      showRoute="/transportation/vehicles/show"
    />
  );
}
