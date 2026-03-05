import CrudPage from "../../components/CrudPage";

export default function AcademicTerms() {
  return (
    <CrudPage
      title="Academic Terms"
      apiEndpoint="/student-management/academic-terms"
      listColumns={[
        { key: "name", label: "Term Name" },
        { key: "start_date", label: "Start Date" },
        { key: "end_date", label: "End Date" },
        { key: "is_current", label: "Is Current", render: (val) => val ? "Yes" : "No" },
      ]}
      createRoute="/student-management/academic-terms/create"
      editRoute="/student-management/academic-terms/edit"
      showRoute="/student-management/academic-terms/show"
    />
  );
}
