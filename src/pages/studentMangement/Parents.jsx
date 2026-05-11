import { Link } from "react-router-dom";
import CrudPage from "../../components/CrudPage";

export default function Parents() {
  return (
    <CrudPage
      permissionBase="parents"
      title="Families Management"
      apiEndpoint="/student-management/families/list"
      searchable={true}
      searchFields={[
        "family_id",
        "father_name",
        "mother_name",
        "father_phone",
        "mother_phone",
        "email",
        "address",
      ]}
      listColumns={[
        { key: "family_id", label: "Family ID" },
        { key: "father_name", label: "Father's Name" },
        { key: "mother_name", label: "Mother's Name" },
        { key: "father_phone", label: "Father's Phone" },
        { key: "mother_phone", label: "Mother's Phone" },
        {key: "email", label: "Email" },
        { key: "address", label: "Address" },
        {
          key: "monthly_income_usd",
          label: "Monthly Income (USD)",
          render: (val) => (val ? `$${parseFloat(val).toLocaleString()}` : "—"),
        },
        {
          key: "add_student",
          label: "Add Student",
          render: (_, item) => {
            const label = encodeURIComponent(`${item.family_id} - ${item.father_name || ""}`);
            return (
              <Link
                to={`/student-management/students/create?family_id=${item.id}&family_label=${label}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg whitespace-nowrap"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add Student
              </Link>
            );
          },
        },
      ]}
      createRoute="/student-management/parents/create"
      editRoute="/student-management/parents/edit"
      showRoute="/student-management/parents/show"
    />
  );
}
