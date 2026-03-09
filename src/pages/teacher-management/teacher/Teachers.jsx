import CrudPage from "../../../components/CrudPage";

export default function Teachers() {
  return (
    <CrudPage
      title="Teachers Management"
      apiEndpoint="/teacher-management/teachers/list"
      searchable={true}
      searchFields={[
        "teacher_id",
        "first_name",
        "last_name",
        "email",
        "phone",
        "cnic",
      ]}
      listColumns={[
        { key: "teacher_id", label: "Teacher ID" },
        { key: "first_name", label: "First Name" },
        { key: "last_name", label: "Last Name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "gender", label: "Gender", render: (val) => val ? val.charAt(0).toUpperCase() + val.slice(1) : "—" },
        { key: "employment_type", label: "Employment Type", render: (val) => val ? val.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : "—" },
        { key: "qualification", label: "Qualification", render: (val) => val ? val.charAt(0).toUpperCase() + val.slice(1) : "—" },
        {
          key: "status",
          label: "Status",
          render: (val) => val ? val.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : "—",
        },
      ]}
      createRoute="/teacher-management/teachers/create"
      editRoute="/teacher-management/teachers/edit"
      showRoute="/teacher-management/teachers/show"
      statusEndpoint="/teacher-management/teachers/update-status"
      statusOptions={[
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
        { value: "on-leave", label: "On Leave" },
      ]}
    />
  );
}
