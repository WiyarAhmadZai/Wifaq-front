import CrudFormPage from "../../components/CrudFormPage";

export default function AccountForm() {
  return (
    <CrudFormPage
      title="Account"
      apiEndpoint="/financial/accounts"
      listRoute="/finance/accounts"
      fields={[
        {
          name: "chart_account_id",
          label: "Chart of accounts (GL)",
          type: "select",
          required: true,
          endpoint: "/financial/chart-of-accounts?active=1",
          valueField: "id",
          displayField: "name",
          formatOption: (o) => `${o.code} — ${o.name} (${o.type})`,
        },
        { name: "account_name", label: "Account name", required: true },
        {
          name: "account_type",
          label: "Account type",
          type: "select",
          required: true,
          options: [
            { value: "bank", label: "Bank" },
            { value: "cash", label: "Cash" },
            { value: "digital", label: "Digital wallet" },
            { value: "mobile_money", label: "Mobile money" },
          ],
        },
        {
          name: "branch_id",
          label: "Branch",
          type: "select",
          endpoint: "/branches/list",
          valueField: "id",
          displayField: "name",
        },
        {
          name: "currency",
          label: "Currency",
          type: "select",
          defaultValue: "AFN",
          options: [
            { value: "AFN", label: "AFN — Afghan Afghani" },
            { value: "USD", label: "USD — US Dollar" },
            { value: "EUR", label: "EUR — Euro" },
          ],
        },
        { name: "opening_balance", label: "Opening balance", type: "number", defaultValue: "0" },
        { name: "bank_name", label: "Bank name (institution)", conditional: { field: "account_type", value: "bank" } },
        {
          name: "branch_name",
          label: "Bank branch / location",
          conditional: { field: "account_type", value: "bank" },
        },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
    />
  );
}
