import CrudFormPage from "../../components/CrudFormPage";

const fields = [
  {
    name: "job_posting_id", label: "Job Posting", type: "search-select", required: true,
    endpoint: "/recruitment/job-postings", valueField: "id", displayField: "title",
  },
  { name: "candidate_name", label: "Candidate Name", type: "text", required: true },
  { name: "email", label: "Email", type: "text", required: true },
  { name: "phone", label: "Phone", type: "text" },
  {
    name: "status", label: "Status", type: "select", required: true,
    options: [
      { value: "received", label: "Received" },
      { value: "screening", label: "Screening" },
      { value: "shortlisted", label: "Shortlisted" },
      { value: "interview", label: "Interview" },
      { value: "offer", label: "Offer" },
      { value: "hired", label: "Hired" },
      { value: "rejected", label: "Rejected" },
      { value: "withdrawn", label: "Withdrawn" },
    ],
    defaultValue: "received",
  },
  {
    name: "source", label: "Source", type: "select",
    options: [
      { value: "website", label: "Website" },
      { value: "referral", label: "Referral" },
      { value: "job_board", label: "Job Board" },
      { value: "internal", label: "Internal" },
    ],
  },
  { name: "notes", label: "Notes", type: "textarea" },
];

export default function ApplicationForm() {
  return (
    <CrudFormPage
      title="Application"
      apiEndpoint="/recruitment/applications"
      fields={fields}
      listRoute="/recruitment/applications"
    />
  );
}
