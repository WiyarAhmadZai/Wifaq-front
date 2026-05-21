import CrudPage from "../../components/CrudPage";

export default function PositionTitles() {
  return (
    <CrudPage
      permissionBase="position-titles"
      title="Position Titles"
      apiEndpoint="/recruitment/position-titles/list"
      deleteEndpoint="/recruitment/position-titles/delete"
      listColumns={[
        { key: "name", label: "Title" },
        { key: "code", label: "Code" },
        { key: "label_native", label: "Bilingual label" },
        {
          key: "is_active",
          label: "Status",
          render: (val) => (
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${
                val ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
              }`}
            >
              {val ? "Active" : "Inactive"}
            </span>
          ),
        },
      ]}
      createRoute="/recruitment/position-titles/create"
      editRoute="/recruitment/position-titles/edit"
      showRoute="/recruitment/position-titles/show"
    />
  );
}
