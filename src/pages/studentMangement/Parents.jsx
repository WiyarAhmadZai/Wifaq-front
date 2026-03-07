import CrudPage from "../../components/CrudPage";

export default function Parents() {
  return (
    <CrudPage
      title="Families Management"
      apiEndpoint="/student-management/families/list"
      searchable={true}
      searchFields={[
        "family_id",
        "father_name",
        "mother_name",
        "father_phone",
        "mother_phone",
        "address",
      ]}
      listColumns={[
        { key: "family_id", label: "Family ID" },
        { key: "father_name", label: "Father's Name" },
        { key: "mother_name", label: "Mother's Name" },
        { key: "father_phone", label: "Father's Phone" },
        { key: "mother_phone", label: "Mother's Phone" },
        { key: "address", label: "Address" },
        {
          key: "monthly_income_usd",
          label: "Monthly Income (USD)",
          render: (val) => (val ? `$${parseFloat(val).toLocaleString()}` : "—"),
        },
      ]}
      createRoute="/student-management/parents/create"
      editRoute="/student-management/parents/edit"
      showRoute="/student-management/parents/show"
    />
  );
}
