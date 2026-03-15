import CrudPage from "../../components/CrudPage";

export default function Students() {
  return (
    <CrudPage
      title="Students Management"
      apiEndpoint="/student-management/students"
      listColumns={[
        { key: "first_name", label: "First Name" },
        { key: "last_name", label: "Last Name" },
        { key: "class_name", label: "Class" },
        { key: "date_of_birth", label: "Date of Birth" },
        { key: "enrollment_date", label: "Enrollment Date" },
        { key: "special_status", label: "Status" },
      ]}
      createRoute="/student-management/students/create"
      editRoute="/student-management/students/edit"
      showRoute="/student-management/students/show"
    />
  );
}
