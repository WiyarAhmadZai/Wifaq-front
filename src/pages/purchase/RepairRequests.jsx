import CrudPage from "../../components/CrudPage";

export default function RepairRequests() {
  return (
    <CrudPage
      permissionBase="repair-requests"
      title="Repair Requests"
      apiEndpoint="/purchase/repair-requests"
      createRoute="/purchase/repair-requests/create"
      editRoute="/purchase/repair-requests/edit"
      showRoute="/purchase/repair-requests/show"
      searchable
      searchFields={["title", "requested_by", "location"]}
      listColumns={[
        { key: "title", label: "Title" },
        { key: "requested_by", label: "Requested By" },
        { key: "location", label: "Location" },
        {
          key: "priority",
          label: "Priority",
          render: (val) => {
            const colors = {
              low: "bg-blue-50 text-blue-700 border-blue-200",
              medium: "bg-amber-50 text-amber-700 border-amber-200",
              high: "bg-orange-50 text-orange-700 border-orange-200",
              urgent: "bg-red-50 text-red-700 border-red-200",
            };
            return (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${colors[val] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                {val || "-"}
              </span>
            );
          },
        },
        {
          key: "status",
          label: "Status",
          render: (val) => {
            const colors = {
              pending: "bg-amber-50 text-amber-700 border-amber-200",
              in_progress: "bg-blue-50 text-blue-700 border-blue-200",
              completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
              cancelled: "bg-red-50 text-red-700 border-red-200",
            };
            return (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${colors[val] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                {val?.replace(/_/g, " ") || "-"}
              </span>
            );
          },
        },
        { key: "estimated_cost", label: "Est. Cost", render: (val) => val ? `${Number(val).toLocaleString()} AFN` : "-" },
      ]}
    />
  );
}
