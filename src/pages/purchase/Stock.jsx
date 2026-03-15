import CrudPage from "../../components/CrudPage";

export default function Stock() {
  return (
    <CrudPage
      title="Stock / Inventory"
      apiEndpoint="/purchase/stock"
      createRoute="/purchase/stock/create"
      editRoute="/purchase/stock/edit"
      showRoute="/purchase/stock/show"
      searchable
      searchFields={["item_name", "category", "location"]}
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
      ]}
    />
  );
}
