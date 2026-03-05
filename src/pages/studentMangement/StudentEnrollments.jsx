import CrudPage from "../../components/CrudPage";

export default function StudentEnrollments() {
  return (
    <CrudPage
      title="Student Enrollments"
      apiEndpoint="/student-management/student-enrollments"
      listColumns={[
        { key: "student_name", label: "Student" },
        { key: "academic_term_name", label: "Academic Term" },
        { key: "class_name", label: "Class" },
        { key: "final_fee", label: "Final Fee" },
        { key: "enrollment_type", label: "Type" },
        { key: "discount_percent", label: "Discount %" },
      ]}
      createRoute="/student-management/student-enrollments/create"
      editRoute="/student-management/student-enrollments/edit"
      showRoute="/student-management/student-enrollments/show"
    />
  );
}
