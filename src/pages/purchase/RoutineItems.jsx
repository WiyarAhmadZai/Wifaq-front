import CrudPage from "../../components/CrudPage";

export default function RoutineItems() {
  return (
    <CrudPage
      permissionBase="routine-items"
      title="Routine Items"
      apiEndpoint="/purchase/routine-items"
      createRoute="/purchase/routine-items/create"
      editRoute="/purchase/routine-items/edit"
      showRoute="/purchase/routine-items/show"
      searchable
      searchFields={["item_name", "category"]}
      listColumns={[
        { key: "item_name", label: "Item Name" },
        { key: "category", label: "Category" },
        { key: "estimated_price", label: "Est. Price", render: (val) => val ? `${Number(val).toLocaleString()} AFN` : "-" },
        { key: "frequency", label: "Frequency", render: (val) => (
          <span className="capitalize">{val?.replace(/_/g, " ") || "-"}</span>
        )},
        {
          key: "is_active",
          label: "Active",
          render: (val) => (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
              val ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-gray-50 text-gray-600 border-gray-200"
            }`}>
              {val ? "Yes" : "No"}
            </span>
          ),
        },
      ]}
    />
  );
}
