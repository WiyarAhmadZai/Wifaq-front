import CrudFormPage from "../../components/CrudFormPage";

export default function RoutineItemForm() {
  return (
    <CrudFormPage
      title="Routine Item"
      apiEndpoint="/purchase/routine-items"
      listRoute="/purchase/routine-items"
      fields={[
        { name: "item_name", label: "Item Name", type: "text", required: true },
        {
          name: "category", label: "Category", type: "select",
          options: [
            { value: "stationery", label: "Stationery" },
            { value: "cleaning", label: "Cleaning Supplies" },
            { value: "food", label: "Food & Beverages" },
            { value: "maintenance", label: "Maintenance" },
            { value: "other", label: "Other" },
          ],
        },
        { name: "estimated_price", label: "Estimated Price (AFN)", type: "number" },
        {
          name: "frequency", label: "Purchase Frequency", type: "select",
          options: [
            { value: "daily", label: "Daily" },
            { value: "weekly", label: "Weekly" },
            { value: "monthly", label: "Monthly" },
            { value: "quarterly", label: "Quarterly" },
            { value: "yearly", label: "Yearly" },
          ],
        },
        { name: "is_active", label: "Active", type: "checkbox", defaultValue: true },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
    />
  );
}
