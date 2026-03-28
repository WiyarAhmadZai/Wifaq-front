import CrudFormPage from "../../components/CrudFormPage";

export default function FeeInvoiceForm() {
  return (
    <CrudFormPage
      title="Fee Invoice"
      apiEndpoint="/finance/fee-invoices"
      listRoute="/finance/fee-invoices"
      fields={[
        { name: "student_name", label: "Student Name", required: true },
        { name: "class", label: "Class", required: true },
        { name: "invoice_month", label: "Invoice Month", type: "date", required: true },
        { name: "base_amount", label: "Base Fee (AFN)", type: "number", required: true },
        { name: "discount_amount", label: "Discount Amount (AFN)", type: "number", defaultValue: 0 },
        { name: "support_amount", label: "Support Amount (AFN)", type: "number", defaultValue: 0 },
        { name: "late_fee", label: "Late Fee (AFN)", type: "number", defaultValue: 0 },
        { name: "status", label: "Status", type: "select", options: [
          { value: "pending", label: "Pending" },
          { value: "partial", label: "Partial" },
          { value: "paid", label: "Paid" },
          { value: "overdue", label: "Overdue" },
        ]},
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
    />
  );
}
