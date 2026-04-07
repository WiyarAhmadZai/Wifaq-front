import CrudPage from "../../components/CrudPage";

const CATEGORY_COLORS = {
  teaching: "bg-blue-100 text-blue-700",
  administration: "bg-purple-100 text-purple-700",
  finance: "bg-emerald-100 text-emerald-700",
  hr: "bg-pink-100 text-pink-700",
  it: "bg-cyan-100 text-cyan-700",
  maintenance: "bg-amber-100 text-amber-700",
  other: "bg-gray-100 text-gray-700",
};

const categoryBadge = (val) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${CATEGORY_COLORS[val] || CATEGORY_COLORS.other}`}>
    {val?.replace(/_/g, " ")}
  </span>
);

const activeBadge = (val) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${val ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
    {val ? "Active" : "Inactive"}
  </span>
);

export default function CandidatePool() {
  return (
    <CrudPage
      title="Candidate Pools"
      apiEndpoint="/recruitment/candidate-pool"
      listColumns={[
        { key: "name", label: "Pool Name" },
        { key: "category", label: "Category", render: categoryBadge },
        { key: "members_count", label: "Candidates", render: (val) => (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full text-xs font-semibold">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {val || 0}
          </span>
        )},
        { key: "is_active", label: "Status", render: activeBadge },
        { key: "created_at", label: "Created", render: (val) => val ? new Date(val).toLocaleDateString() : "-" },
      ]}
      createRoute="/recruitment/candidate-pool/create"
      editRoute="/recruitment/candidate-pool/edit"
      showRoute="/recruitment/candidate-pool/show"
      searchable={true}
      searchFields={["name", "category"]}
    />
  );
}
