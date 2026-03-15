import CrudShowPage from "../../components/CrudShowPage";

const fields = [
  { name: "title", label: "Job Title" },
  { name: "description", label: "Description" },
  { name: "requirements", label: "Requirements" },
  { name: "location", label: "Location" },
  { name: "application_deadline", label: "Application Deadline" },
  {
    name: "status", label: "Status", type: "select",
    options: [
      { value: "draft", label: "Draft" },
      { value: "published", label: "Published" },
      { value: "closed", label: "Closed" },
      { value: "archived", label: "Archived" },
    ],
  },
  { name: "published_at", label: "Published At" },
  { name: "created_at", label: "Created At" },
];

export default function JobPostingShow() {
  return (
    <CrudShowPage
      title="Job Posting"
      apiEndpoint="/recruitment/job-postings"
      fields={fields}
      listRoute="/recruitment/job-postings"
      editRoute="/recruitment/job-postings/edit"
    />
  );
}
