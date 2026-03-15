import CrudPage from "../../components/CrudPage";

const decisionBadge = (val) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
    val === "hired" ? "bg-emerald-100 text-emerald-700" :
    val === "rejected" ? "bg-red-100 text-red-700" :
    val === "candidate_withdrew" ? "bg-amber-100 text-amber-700" :
    "bg-gray-100 text-gray-700"
  }`}>{val?.replace(/_/g, " ")}</span>
);

export default function HiringDecisions() {
  return (
    <CrudPage
      title="Hiring Decisions"
      apiEndpoint="/recruitment/hiring-decisions"
      listColumns={[
        { key: "candidate_name", label: "Candidate" },
        { key: "decision", label: "Decision", render: decisionBadge },
        { key: "decided_by_name", label: "Decided By" },
        { key: "decided_at", label: "Decision Date" },
      ]}
      createRoute="/recruitment/hiring-decisions/create"
      editRoute="/recruitment/hiring-decisions/edit"
      showRoute="/recruitment/hiring-decisions/show"
      searchable={true}
      searchFields={["candidate_name", "decision"]}
    />
  );
}
