import CrudFormPage from "../../components/CrudFormPage";

const fields = [
  {
    name: "application_id", label: "Application (Candidate)", type: "search-select", required: true,
    endpoint: "/recruitment/applications", valueField: "id", displayField: "candidate_name",
  },
  {
    name: "interview_type", label: "Interview Type", type: "select", required: true,
    options: [
      { value: "phone", label: "Phone" },
      { value: "online", label: "Online" },
      { value: "in_person", label: "In Person" },
      { value: "panel", label: "Panel" },
    ],
  },
  { name: "scheduled_at", label: "Scheduled At", type: "datetime-local", required: true },
  { name: "location", label: "Location", type: "text" },
  {
    name: "status", label: "Status", type: "select",
    options: [
      { value: "scheduled", label: "Scheduled" },
      { value: "completed", label: "Completed" },
      { value: "cancelled", label: "Cancelled" },
    ],
    defaultValue: "scheduled",
  },
];

export default function InterviewForm() {
  return (
    <CrudFormPage
      title="Interview"
      apiEndpoint="/recruitment/interviews"
      fields={fields}
      listRoute="/recruitment/interviews"
    />
  );
}
