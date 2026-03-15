import CrudPage from "../../components/CrudPage";

export default function Projects() {
  return (
    <CrudPage
      title="Projects"
      apiEndpoint="/purchase/projects"
      createRoute="/purchase/projects/create"
      editRoute="/purchase/projects/edit"
      showRoute="/purchase/projects/show"
      searchable
      searchFields={["name", "manager"]}
      listColumns={[
        { key: "name", label: "Project Name" },
        { key: "manager", label: "Manager" },
        { key: "budget", label: "Budget", render: (val) => val ? `${Number(val).toLocaleString()} AFN` : "-" },
        { key: "start_date", label: "Start Date", render: (val) => val ? new Date(val).toLocaleDateString() : "-" },
        { key: "end_date", label: "End Date", render: (val) => val ? new Date(val).toLocaleDateString() : "-" },
        {
          key: "status",
          label: "Status",
          render: (val) => {
            const colors = {
              planning: "bg-blue-50 text-blue-700 border-blue-200",
              active: "bg-emerald-50 text-emerald-700 border-emerald-200",
              on_hold: "bg-amber-50 text-amber-700 border-amber-200",
              completed: "bg-teal-50 text-teal-700 border-teal-200",
              cancelled: "bg-red-50 text-red-700 border-red-200",
            };
            return (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${colors[val] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                {val?.replace(/_/g, " ") || "-"}
              </span>
            );
          },
        },
      ]}
    />
  );
}
