import CrudShowPage from "../../components/CrudShowPage";

export default function StockShow() {
  return (
    <CrudShowPage
      title="Stock Item"
      apiEndpoint="/purchase/stock/show"
      deleteEndpoint="/purchase/stock/delete"
      listRoute="/purchase/stock"
      editRoute="/purchase/stock/edit"
      fields={[
        { name: "item_name", label: "Item Name" },
        { name: "category", label: "Category" },
        { name: "quantity", label: "Quantity" },
        { name: "unit", label: "Unit" },
        { name: "unit_price", label: "Unit Price (AFN)" },
        { name: "min_stock_level", label: "Minimum Stock Level" },
        { name: "location", label: "Storage Location" },
        { name: "notes", label: "Notes" },
      ]}
    />
  );
}
