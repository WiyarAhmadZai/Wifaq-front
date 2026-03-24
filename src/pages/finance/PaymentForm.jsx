import CrudFormPage from "../../components/CrudFormPage";

export default function PaymentForm() {
  return (
    <CrudFormPage
      title="Payment"
      apiEndpoint="/finance/payments"
      listRoute="/finance/payments"
      fields={[
        { name: "reference", label: "Payment Reference" },
        { name: "invoice_number", label: "Invoice Number" },
        { name: "supplier", label: "Supplier / Purpose", required: true },
        { name: "payment_date", label: "Payment Date", type: "date", required: true },
        { name: "amount", label: "Amount (AFN)", type: "number", required: true },
        { name: "payment_method", label: "Payment Method", type: "select", required: true, options: [
          { value: "cash", label: "Cash" },
          { value: "bank", label: "Bank Transfer" },
          { value: "mobile", label: "Mobile Money" },
        ]},
        { name: "account", label: "Account", type: "select", options: [
          { value: "Main Bank", label: "Main Bank Account" },
          { value: "Petty Cash", label: "Petty Cash Box" },
          { value: "Mobile Wallet", label: "Mobile Wallet" },
        ]},
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
    />
  );
}
