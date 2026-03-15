import CrudFormPage from "../../components/CrudFormPage";

const fields = [
  {
    name: "application_id", label: "Application (Candidate)", type: "search-select", required: true,
    endpoint: "/recruitment/applications", valueField: "id", displayField: "candidate_name",
  },
  { name: "proposed_salary", label: "Proposed Salary (AFN)", type: "number", required: true },
  { name: "start_date", label: "Start Date", type: "date", required: true },
  {
    name: "offer_status", label: "Offer Status", type: "select",
    options: [
      { value: "draft", label: "Draft" },
      { value: "sent", label: "Sent" },
      { value: "accepted", label: "Accepted" },
      { value: "declined", label: "Declined" },
      { value: "expired", label: "Expired" },
    ],
    defaultValue: "draft",
  },
];

export default function JobOfferForm() {
  return (
    <CrudFormPage
      title="Job Offer"
      apiEndpoint="/recruitment/job-offers"
      fields={fields}
      listRoute="/recruitment/job-offers"
    />
  );
}
