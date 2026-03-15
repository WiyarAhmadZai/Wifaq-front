import CrudShowPage from "../../components/CrudShowPage";

export default function RoutineItemShow() {
  return (
    <CrudShowPage
      title="Routine Item"
      apiEndpoint="/purchase/routine-items"
      listRoute="/purchase/routine-items"
      editRoute="/purchase/routine-items/edit"
      fields={[
        { name: "item_name", label: "Item Name" },
        { name: "category", label: "Category" },
        { name: "estimated_price", label: "Estimated Price (AFN)" },
        { name: "frequency", label: "Purchase Frequency" },
        { name: "is_active", label: "Active", type: "checkbox" },
        { name: "notes", label: "Notes" },
      ]}
    />
  );
}
