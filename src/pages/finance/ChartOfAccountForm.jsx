import CrudFormPage from "../../components/CrudFormPage";

export default function ChartOfAccountForm() {
  return (
    <CrudFormPage
      title="Chart of Account"
      apiEndpoint="/financial/chart-of-accounts"
      listRoute="/finance/chart-of-accounts"
      fields={[
        {
          name: "type",
          label: "Account Type",
          type: "select",
          required: true,
          options: [
            { value: "Asset", label: "Asset" },
            { value: "Liability", label: "Liability" },
            { value: "Equity", label: "Equity" },
            { value: "Income", label: "Income" },
            { value: "Expense", label: "Expense" },
          ],
        },
        { name: "name", label: "Account Name", required: true },
        { name: "description", label: "Description", type: "textarea" },
        { name: "is_active", label: "Active", type: "checkbox", defaultValue: true },
      ]}
    />
  );
}
