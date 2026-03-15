import CrudFormPage from "../../components/CrudFormPage";

const fields = [
  {
    name: "application_id", label: "Application (Candidate)", type: "search-select", required: true,
    endpoint: "/recruitment/applications", valueField: "id", displayField: "candidate_name",
  },
  {
    name: "decision", label: "Decision", type: "select", required: true,
    options: [
      { value: "hired", label: "Hired" },
      { value: "rejected", label: "Rejected" },
      { value: "candidate_withdrew", label: "Candidate Withdrew" },
    ],
  },
  {
    name: "decided_by", label: "Decided By", type: "search-select",
    endpoint: "/hr/staff", valueField: "id", displayField: "full_name",
  },
  { name: "notes", label: "Notes", type: "textarea" },
];

export default function HiringDecisionForm() {
  return (
    <CrudFormPage
      title="Hiring Decision"
      apiEndpoint="/recruitment/hiring-decisions"
      fields={fields}
      listRoute="/recruitment/hiring-decisions"
    />
  );
}
