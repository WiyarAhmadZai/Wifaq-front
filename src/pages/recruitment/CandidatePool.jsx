import CrudPage from "../../components/CrudPage";

const categoryBadge = (val) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
    val === "teaching" ? "bg-blue-100 text-blue-700" :
    val === "administration" ? "bg-purple-100 text-purple-700" :
    val === "finance" ? "bg-emerald-100 text-emerald-700" :
    "bg-gray-100 text-gray-700"
  }`}>{val?.replace(/_/g, " ")}</span>
);

export default function CandidatePool() {
  return (
    <CrudPage
      title="Candidate Pool"
      apiEndpoint="/recruitment/candidate-pool"
      listColumns={[
        { key: "candidate_name", label: "Candidate" },
        { key: "email", label: "Email" },
        { key: "pool_category", label: "Category", render: categoryBadge },
        { key: "added_at", label: "Added At" },
        { key: "notes", label: "Notes", render: (val) => val ? (val.length > 40 ? val.substring(0, 40) + "..." : val) : "-" },
      ]}
      createRoute="/recruitment/candidate-pool/create"
      editRoute="/recruitment/candidate-pool/edit"
      showRoute="/recruitment/candidate-pool/show"
      searchable={true}
      searchFields={["candidate_name", "email", "pool_category"]}
    />
  );
}
