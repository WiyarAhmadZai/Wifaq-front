import CrudPage from "../../components/CrudPage";

export default function AcademicTerms() {
  return (
    <CrudPage
      title="Academic Terms"
      apiEndpoint="/academic-terms/list"
      deleteEndpoint="/academic-terms/delete"
      searchable={true}
      searchFields={["name"]}
      listColumns={[
        { key: "name", label: "Term Name" },
        {
          key: "start_date",
          label: "Start Date",
          render: (val) =>
            val
              ? new Date(val).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "—",
        },
        {
          key: "end_date",
          label: "End Date",
          render: (val) =>
            val
              ? new Date(val).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "—",
        },
        {
          key: "is_current",
          label: "Status",
          render: (val) =>
            val ? (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                Current
              </span>
            ) : (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                Previous
              </span>
            ),
        },
      ]}
      createRoute="/student-management/academic-terms/create"
      editRoute="/student-management/academic-terms/edit"
      showRoute="/student-management/academic-terms/show"
    />
  );
}
