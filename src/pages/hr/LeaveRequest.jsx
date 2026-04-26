import CrudPage from "../../components/CrudPage";

const statusBadge = (val) => {
  const conf = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${conf[val] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
      {val || "-"}
    </span>
  );
};

const leaveTypeBadge = (val) => {
  const conf = {
    sick: "bg-red-50 text-red-700 border-red-200",
    casual: "bg-blue-50 text-blue-700 border-blue-200",
    annual: "bg-teal-50 text-teal-700 border-teal-200",
    emergency: "bg-orange-50 text-orange-700 border-orange-200",
    maternity: "bg-pink-50 text-pink-700 border-pink-200",
    unpaid: "bg-gray-50 text-gray-700 border-gray-200",
    other: "bg-purple-50 text-purple-700 border-purple-200",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${conf[val] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
      {val?.replace(/_/g, " ") || "-"}
    </span>
  );
};

export default function LeaveRequest() {
  return (
    <CrudPage
      permissionBase="leave-request"
      title="Leave Requests"
      apiEndpoint="/hr/leave-requests"
      createRoute="/hr/leave-request/create"
      editRoute="/hr/leave-request/edit"
      showRoute="/hr/leave-request/show"
      deleteEndpoint="/hr/leave-requests"
      searchable
      searchFields={["leave_type", "reason", "coverage_plan"]}
      statusEndpoint="/hr/leave-requests"
      statusSuffix="/status"
      statusField="status"
      statusOptions={[
        { value: "pending", label: "Pending" },
        { value: "approved", label: "Approved" },
        { value: "rejected", label: "Rejected" },
      ]}
      listColumns={[
        {
          key: "staff",
          label: "Staff",
          render: (val, item) => {
            const name = item.staff?.application?.full_name || item.staff?.full_name || "-";
            const empId = item.staff?.employee_id || "";
            return (
              <div>
                <p className="text-xs font-medium text-gray-800">{name}</p>
                {empId && <p className="text-[10px] text-gray-400">{empId}</p>}
              </div>
            );
          },
        },
        { key: "leave_type", label: "Type", render: leaveTypeBadge },
        { key: "from_date", label: "From", render: (val) => val ? new Date(val).toLocaleDateString() : "-" },
        { key: "to_date", label: "To", render: (val) => val ? new Date(val).toLocaleDateString() : "-" },
        { key: "total_days", label: "Days", render: (val) => <span className="font-semibold">{val}</span> },
        { key: "status", label: "Status", render: statusBadge },
      ]}
    />
  );
}
