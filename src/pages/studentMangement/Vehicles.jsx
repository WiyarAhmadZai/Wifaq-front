import CrudPage from "../../components/CrudPage";

export default function Vehicles() {
  return (
    <CrudPage
      title="Vehicles Management"
      apiEndpoint="/transportation/vehicles"
      listColumns={[
        { key: "plate_number", label: "Plate Number" },
        { key: "route_name", label: "Route" },
        { key: "driver_name", label: "Driver Name" },
        { key: "driver_contact", label: "Driver Contact" },
        { key: "total_seats", label: "Total Seats" },
        { key: "is_active", label: "Status", render: (val) => val ? "Active" : "Inactive" },
      ]}
      createRoute="/transportation/vehicles/create"
      editRoute="/transportation/vehicles/edit"
      showRoute="/transportation/vehicles/show"
    />
  );
}
