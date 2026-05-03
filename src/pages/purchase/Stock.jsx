import CrudPage from "../../components/CrudPage";

export default function Stock() {
  return (
    <CrudPage
      permissionBase="stock"
      title="Stock / Inventory"
      apiEndpoint="/purchase/stock/index"
      createRoute="/purchase/stock/create"
      editRoute="/purchase/stock/edit"
      showRoute="/purchase/stock/show"
      deleteEndpoint="/purchase/stock/delete"
      searchable
      searchFields={["item_name", "category", "location"]}
      statusEndpoint="/purchase/stock/status"
      statusField="status"
      statusOptions={[
        { value: "active", label: "Active", color: "emerald" },
        { value: "inactive", label: "Inactive", color: "gray" },
      ]}
      listColumns={[
        { key: "item_name", label: "Item Name" },
        { key: "category", label: "Category" },
        {
          key: "quantity",
          label: "Qty",
          render: (val) => (
            <span className={`font-semibold ${val <= 5 ? "text-red-600" : val <= 15 ? "text-amber-600" : "text-gray-800"}`}>
              {val}
            </span>
          ),
        },
        { key: "unit", label: "Unit" },
        { key: "unit_price", label: "Unit Price", render: (val) => val ? `${Number(val).toLocaleString()} AFN` : "-" },
        { key: "location", label: "Location" },
        {
          key: "status",
          label: "Status",
          render: (val) => (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
              val === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-gray-50 text-gray-600 border-gray-200"
            }`}>
              {val || "active"}
            </span>
          ),
        },
      ]}
    />
  );
}
