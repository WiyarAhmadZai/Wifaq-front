import CrudFormPage from "../../components/CrudFormPage";

export default function StockForm() {
  return (
    <CrudFormPage
      title="Stock Item"
      apiEndpoint="/purchase/stock/show"
      storeEndpoint="/purchase/stock/store"
      editEndpoint="/purchase/stock/edit"
      listRoute="/purchase/stock"
      fields={[
        { name: "item_name", label: "Item Name", type: "text", required: true },
        {
          name: "category", label: "Category", type: "select",
          options: [
            { value: "stationery", label: "Stationery" },
            { value: "furniture", label: "Furniture" },
            { value: "electronics", label: "Electronics" },
            { value: "cleaning", label: "Cleaning Supplies" },
            { value: "books", label: "Books & Materials" },
            { value: "other", label: "Other" },
          ],
        },
        { name: "quantity", label: "Quantity", type: "number", required: true },
        { name: "unit", label: "Unit (pcs, kg, box, etc.)", type: "text", required: true },
        { name: "unit_price", label: "Unit Price (AFN)", type: "number" },
        { name: "min_stock_level", label: "Minimum Stock Level", type: "number" },
        { name: "location", label: "Storage Location", type: "text" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
    />
  );
}
