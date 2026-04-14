import { Link } from "react-router-dom";
import CrudPage from "../../components/CrudPage";

const specialStatusBadge = (val) => {
  if (!val || val === "none") return <span className="text-xs text-gray-400">—</span>;
  const map = {
    orphan: "bg-amber-100 text-amber-700",
    employee_child: "bg-blue-100 text-blue-700",
    fourth_child: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[val] || "bg-gray-100 text-gray-700"}`}>
      {val.replace(/_/g, " ")}
    </span>
  );
};

const PHASE_1_PARAMS = { registration_status: "phase_1" };

export default function Students() {
  return (
    <CrudPage
      title="Phase 1 Students — Pending Enrollment"
      apiEndpoint="/student-management/students/list"
      deleteEndpoint="/student-management/students/delete"
      baseParams={PHASE_1_PARAMS}
      listColumns={[
        { key: "student_id", label: "Student ID" },
        { key: "full_name", label: "Name", render: (_, item) => `${item.first_name} ${item.last_name}` },
        { key: "school_class", label: "Class", render: (_, item) => item.school_class?.class_name || "—" },
        { key: "date_of_birth", label: "DOB", render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
        { key: "final_fee", label: "Fee", render: (v) => v ? `${Number(v).toLocaleString()} AFN` : "—" },
        { key: "special_status", label: "Special", render: specialStatusBadge },
        {
          key: "phase2",
          label: "Phase 2",
          render: (_, item) => (
            <Link
              to={`/student-management/student-enrollments/create?student_id=${item.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg"
            >
              Enroll →
            </Link>
          ),
        },
      ]}
      createRoute="/student-management/students/create"
      editRoute="/student-management/students/edit"
      showRoute="/student-management/students/show"
      searchable={true}
      searchFields={["first_name", "last_name", "student_id"]}
    />
  );
}
