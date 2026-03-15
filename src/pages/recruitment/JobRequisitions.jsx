import CrudPage from "../../components/CrudPage";

const statusBadge = (val) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
    val === "approved" ? "bg-emerald-100 text-emerald-700" :
    val === "pending" ? "bg-amber-100 text-amber-700" :
    val === "rejected" ? "bg-red-100 text-red-700" :
    val === "cancelled" ? "bg-gray-100 text-gray-700" :
    "bg-gray-100 text-gray-700"
  }`}>{val?.replace(/_/g, " ")}</span>
);

export default function JobRequisitions() {
  return (
    <CrudPage
      title="Job Requisitions"
      apiEndpoint="/recruitment/job-requisitions"
      listColumns={[
        { key: "position_title", label: "Position" },
        { key: "employment_type", label: "Type", render: (val) => <span className="capitalize">{val?.replace(/_/g, " ")}</span> },
        { key: "number_of_positions", label: "Positions" },
        { key: "approval_status", label: "Status", render: statusBadge },
      ]}
      createRoute="/recruitment/job-requisitions/create"
      editRoute="/recruitment/job-requisitions/edit"
      showRoute="/recruitment/job-requisitions/show"
      searchable={true}
      searchFields={["position_title", "employment_type"]}
      statusEndpoint="/recruitment/job-requisitions/status"
      statusOptions={[
        { value: "pending", label: "Pending" },
        { value: "approved", label: "Approved" },
        { value: "rejected", label: "Rejected" },
        { value: "cancelled", label: "Cancelled" },
      ]}
    />
  );
}
