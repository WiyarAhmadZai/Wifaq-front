import CrudPage from "../../components/CrudPage";
import { STAFF_GROUPS } from "../../api/positionTitles";

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
          // Which group the Staff page lists this title's holders under.
          key: "category",
          label: "Staff group",
          render: (val) => {
            const g = STAFF_GROUPS.find((x) => x.key === val);
            return g
              ? <span className="px-2 py-1 text-xs font-medium rounded-full bg-teal-50 text-teal-700">{g.label}</span>
              : <span className="text-xs text-amber-600">Not set</span>;
          },
        },
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
