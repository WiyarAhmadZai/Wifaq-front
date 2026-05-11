import CrudPage from "../../components/CrudPage";

const statusBadge = (val) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
    val === "accepted" ? "bg-emerald-100 text-emerald-700" :
    val === "sent" ? "bg-blue-100 text-blue-700" :
    val === "draft" ? "bg-gray-100 text-gray-700" :
    val === "declined" ? "bg-red-100 text-red-700" :
    val === "expired" ? "bg-amber-100 text-amber-700" :
    "bg-gray-100 text-gray-700"
  }`}>{val?.replace(/_/g, " ")}</span>
);

export default function JobOffers() {
  return (
    <CrudPage
      permissionBase="applications"
      title="Job Offers"
      apiEndpoint="/recruitment/job-offers"
      listColumns={[
        { key: "candidate_name", label: "Candidate" },
        { key: "proposed_salary", label: "Salary", render: (val) => val ? `${Number(val).toLocaleString()} AFN` : "-" },
        { key: "start_date", label: "Start Date" },
        { key: "offer_status", label: "Status", render: statusBadge },
        { key: "sent_at", label: "Sent At" },
      ]}
      createRoute="/recruitment/job-offers/create"
      editRoute="/recruitment/job-offers/edit"
      showRoute="/recruitment/job-offers/show"
      searchable={true}
      searchFields={["candidate_name"]}
    />
  );
}
