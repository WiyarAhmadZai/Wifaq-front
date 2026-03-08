import CrudPage from "../../components/CrudPage";

export default function Grades() {
  return (
    <CrudPage
      title="Grades Management"
      apiEndpoint="/grades/list"
      deleteEndpoint="/grades/delete"
      searchable={true}
      searchFields={["name", "base_fee"]}
      listColumns={[
        { key: "name", label: "Grade Name" },
        {
          key: "base_fee",
          label: "Base Fee (AFN)",
          render: (val) => `${parseFloat(val).toLocaleString()} AFN`,
        },
      ]}
      createRoute="/student-management/grades/create"
      editRoute="/student-management/grades/edit"
      showRoute="/student-management/grades/show"
    />
  );
}
