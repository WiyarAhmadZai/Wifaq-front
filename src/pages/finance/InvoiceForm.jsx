import CrudFormPage from "../../components/CrudFormPage";

export default function InvoiceForm() {
  return (
    <CrudFormPage
      title="Invoice"
      apiEndpoint="/finance/invoices"
      listRoute="/finance/invoices"
      fields={[
        { name: "invoice_number", label: "Invoice Number", required: true },
        { name: "supplier", label: "Supplier Name", required: true },
        { name: "invoice_date", label: "Invoice Date", type: "date", required: true },
        { name: "due_date", label: "Due Date", type: "date", required: true },
        { name: "total_amount", label: "Total Amount (AFN)", type: "number", required: true },
        { name: "status", label: "Status", type: "select", required: true, options: [
          { value: "pending", label: "Pending" },
          { value: "approved", label: "Approved" },
          { value: "paid", label: "Paid" },
          { value: "overdue", label: "Overdue" },
        ]},
        { name: "account_id", label: "Expense Category", type: "select", options: [
          { value: "5000", label: "Salaries (5000)" },
          { value: "5100", label: "Office Supplies (5100)" },
          { value: "5200", label: "Utilities (5200)" },
          { value: "5300", label: "Maintenance (5300)" },
          { value: "5400", label: "Transportation (5400)" },
        ]},
        { name: "description", label: "Description", type: "textarea" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
    />
  );
}
