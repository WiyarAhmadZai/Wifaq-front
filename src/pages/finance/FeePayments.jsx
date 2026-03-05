import CrudPage from "../../components/CrudPage";

export default function FeePayments() {
  return (
    <CrudPage
      title="Fee Payments"
      apiEndpoint="/finance/fee-payments"
      listColumns={[
        { key: "student_name", label: "Student" },
        { key: "payment_date", label: "Payment Date" },
        { key: "amount_paid", label: "Amount Paid" },
        { key: "month_covered", label: "Month Covered" },
        { key: "payment_method", label: "Payment Method" },
      ]}
      createRoute="/finance/fee-payments/create"
      editRoute="/finance/fee-payments/edit"
      showRoute="/finance/fee-payments/show"
    />
  );
}
