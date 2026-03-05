import CrudPage from "../../components/CrudPage";

export default function Parents() {
  return (
    <CrudPage
      title="Parents Management"
      apiEndpoint="/student-management/parents"
      listColumns={[
        { key: "father_name", label: "Father's Name" },
        { key: "mother_name", label: "Mother's Name" },
        { key: "father_phone", label: "Father's Phone" },
        { key: "mother_phone", label: "Mother's Phone" },
        { key: "address", label: "Address" },
        { key: "monthly_income", label: "Monthly Income" },
      ]}
      createRoute="/student-management/parents/create"
      editRoute="/student-management/parents/edit"
      showRoute="/student-management/parents/show"
    />
  );
}
