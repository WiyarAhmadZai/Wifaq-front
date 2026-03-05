import CrudPage from "../../components/CrudPage";

export default function Classes() {
  return (
    <CrudPage
      title="Classes Management"
      apiEndpoint="/student-management/classes"
      listColumns={[
        { key: "name", label: "Class Name" },
        { key: "base_fee", label: "Base Fee (AFN)" },
      ]}
      createRoute="/student-management/classes/create"
      editRoute="/student-management/classes/edit"
      showRoute="/student-management/classes/show"
    />
  );
}
