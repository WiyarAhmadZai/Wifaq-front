import CrudPage from "../../components/CrudPage";

// This will be called by CrudPage when rendering status column with onClick handler
const statusBadge = (val, item, onClick) => (
  <button
    onClick={() => onClick && onClick(item)}
    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer hover:opacity-80 transition-opacity ${
      val === "approved" ? "bg-emerald-100 text-emerald-700" :
      val === "pending" ? "bg-amber-100 text-amber-700" :
      val === "rejected" ? "bg-red-100 text-red-700" :
      val === "cancelled" ? "bg-gray-100 text-gray-700" :
      "bg-gray-100 text-gray-700"
    }`}
  >
    {val?.replace(/_/g, " ")}
  </button>
);

export default function JobRequisitions() {
  return (
    <CrudPage
      permissionBase="job-requisitions"
      title="Job Applications"
      apiEndpoint="/recruitment/job-requisitions"
      listColumns={[
        { key: "position_title", label: "Position" },
        { key: "employment_type", label: "Type", render: (val) => <span className="capitalize">{val?.replace(/_/g, " ")}</span> },
        { key: "number_of_positions", label: "Positions" },
        { key: "department", label: "Department" },
        { key: "deadline_date", label: "Deadline", render: (val) => val ? new Date(val).toLocaleDateString() : "-" },
        { key: "approval_status", label: "Status", render: statusBadge, isStatus: true },
      ]}
      createRoute="/recruitment/job-requisitions/create"
      editRoute="/recruitment/job-requisitions/edit"
      showRoute="/recruitment/job-requisitions/show"
      searchable={true}
      searchFields={["position_title", "employment_type"]}
      statusEndpoint="/recruitment/job-requisitions"
      statusField="approval_status"
      statusOptions={[
        { value: "pending", label: "Pending" },
        { value: "approved", label: "Approved" },
        { value: "rejected", label: "Rejected" },
        { value: "cancelled", label: "Cancelled" },
      ]}
    />
  );
}
