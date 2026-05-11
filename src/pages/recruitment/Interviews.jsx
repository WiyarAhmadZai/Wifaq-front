import CrudPage from "../../components/CrudPage";

const statusBadge = (val) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
    val === "completed" ? "bg-emerald-100 text-emerald-700" :
    val === "scheduled" ? "bg-blue-100 text-blue-700" :
    val === "cancelled" ? "bg-red-100 text-red-700" :
    "bg-gray-100 text-gray-700"
  }`}>{val?.replace(/_/g, " ")}</span>
);

export default function Interviews() {
  return (
    <CrudPage
      permissionBase="applications"
      title="Interviews"
      apiEndpoint="/recruitment/interviews"
      listColumns={[
        { key: "candidate_name", label: "Candidate" },
        { key: "interview_type", label: "Type", render: (val) => <span className="capitalize">{val?.replace(/_/g, " ")}</span> },
        { key: "scheduled_at", label: "Scheduled At" },
        { key: "location", label: "Location" },
        { key: "status", label: "Status", render: statusBadge },
      ]}
      createRoute="/recruitment/interviews/create"
      editRoute="/recruitment/interviews/edit"
      showRoute="/recruitment/interviews/show"
      searchable={true}
      searchFields={["candidate_name", "interview_type", "location"]}
      statusEndpoint="/recruitment/interviews/status"
      statusOptions={[
        { value: "scheduled", label: "Scheduled" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
      ]}
    />
  );
}
