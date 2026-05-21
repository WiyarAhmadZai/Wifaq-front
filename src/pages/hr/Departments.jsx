import CrudPage from "../../components/CrudPage";

export default function Departments() {
  return (
    <CrudPage
      permissionBase="departments"
      title="Departments"
      apiEndpoint="/hr/departments/list"
      deleteEndpoint="/hr/departments/delete"
      listColumns={[
        { key: "name", label: "Department" },
        { key: "code", label: "Code" },
        { key: "description", label: "Description" },
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
      createRoute="/hr/departments/create"
      editRoute="/hr/departments/edit"
      showRoute="/hr/departments/show"
    />
  );
}
