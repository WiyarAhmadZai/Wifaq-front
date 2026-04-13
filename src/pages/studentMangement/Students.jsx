import CrudPage from "../../components/CrudPage";

const statusBadge = (val) => {
  const map = {
    active: "bg-emerald-100 text-emerald-700",
    graduated: "bg-blue-100 text-blue-700",
    withdrawn: "bg-gray-100 text-gray-500",
    transferred: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[val] || "bg-gray-100 text-gray-700"}`}>
      {val?.replace(/_/g, " ")}
    </span>
  );
};

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

export default function Students() {
  return (
    <CrudPage
      title="Students Management"
      apiEndpoint="/student-management/students/list"
      deleteEndpoint="/student-management/students/delete"
      listColumns={[
        { key: "student_id", label: "Student ID" },
        { key: "full_name", label: "Name", render: (_, item) => `${item.first_name} ${item.last_name}` },
        { key: "school_class", label: "Class", render: (_, item) => item.school_class?.class_name || "—" },
        { key: "date_of_birth", label: "DOB", render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
        { key: "final_fee", label: "Fee", render: (v) => v ? `${Number(v).toLocaleString()} AFN` : "—" },
        { key: "special_status", label: "Special", render: specialStatusBadge },
        { key: "status", label: "Status", render: statusBadge },
      ]}
      createRoute="/student-management/students/create"
      editRoute="/student-management/students/edit"
      showRoute="/student-management/students/show"
      searchable={true}
      searchFields={["first_name", "last_name", "student_id"]}
    />
  );
}
