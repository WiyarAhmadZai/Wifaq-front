import CrudFormPage from "../../components/CrudFormPage";

export default function AccountForm() {
  return (
    <CrudFormPage
      title="Account"
      apiEndpoint="/finance/accounts"
      listRoute="/finance/accounts"
      fields={[
        { name: "account_name", label: "Account Name", required: true },
        { name: "account_type", label: "Account Type", type: "select", required: true, options: [
          { value: "bank", label: "Bank Account" },
          { value: "cash", label: "Cash Box" },
          { value: "digital", label: "Digital Wallet" },
        ]},
        { name: "account_number", label: "Account Number" },
        { name: "currency", label: "Currency", type: "select", options: [
          { value: "AFN", label: "AFN - Afghan Afghani" },
          { value: "USD", label: "USD - US Dollar" },
          { value: "EUR", label: "EUR - Euro" },
        ]},
        { name: "opening_balance", label: "Opening Balance (AFN)", type: "number" },
        { name: "bank_name", label: "Bank Name" },
        { name: "branch", label: "Branch" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
    />
  );
}
