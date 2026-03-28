import CrudFormPage from "../../components/CrudFormPage";

export default function ChartOfAccountForm() {
  return (
    <CrudFormPage
      title="Chart of Account"
      apiEndpoint="/finance/chart-of-accounts"
      listRoute="/finance/chart-of-accounts"
      fields={[
        { name: "code", label: "Account Code", required: true, placeholder: "e.g. 5100" },
        { name: "name", label: "Account Name", required: true },
        { name: "type", label: "Account Type", type: "select", required: true, options: [
          { value: "Asset", label: "Asset" },
          { value: "Liability", label: "Liability" },
          { value: "Income", label: "Income" },
          { value: "Expense", label: "Expense" },
        ]},
        { name: "description", label: "Description", type: "textarea" },
        { name: "is_active", label: "Active", type: "checkbox", defaultValue: true },
      ]}
    />
  );
}
