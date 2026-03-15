import CrudFormPage from "../../components/CrudFormPage";

const fields = [
  {
    name: "requisition_id", label: "Job Requisition", type: "search-select",
    endpoint: "/recruitment/job-requisitions", valueField: "id", displayField: "position_title",
  },
  { name: "title", label: "Job Title", type: "text", required: true },
  { name: "description", label: "Description", type: "textarea", required: true },
  { name: "requirements", label: "Requirements", type: "textarea" },
  { name: "location", label: "Location", type: "text" },
  { name: "application_deadline", label: "Application Deadline", type: "date", required: true },
  {
    name: "status", label: "Status", type: "select",
    options: [
      { value: "draft", label: "Draft" },
      { value: "published", label: "Published" },
      { value: "closed", label: "Closed" },
      { value: "archived", label: "Archived" },
    ],
    defaultValue: "draft",
  },
];

export default function JobPostingForm() {
  return (
    <CrudFormPage
      title="Job Posting"
      apiEndpoint="/recruitment/job-postings"
      fields={fields}
      listRoute="/recruitment/job-postings"
    />
  );
}
