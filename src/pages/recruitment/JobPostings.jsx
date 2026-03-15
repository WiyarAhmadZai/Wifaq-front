import CrudPage from "../../components/CrudPage";

const statusBadge = (val) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
    val === "published" ? "bg-emerald-100 text-emerald-700" :
    val === "draft" ? "bg-gray-100 text-gray-700" :
    val === "closed" ? "bg-red-100 text-red-700" :
    val === "archived" ? "bg-amber-100 text-amber-700" :
    "bg-gray-100 text-gray-700"
  }`}>{val?.replace(/_/g, " ")}</span>
);

export default function JobPostings() {
  return (
    <CrudPage
      title="Job Postings"
      apiEndpoint="/recruitment/job-postings"
      listColumns={[
        { key: "title", label: "Title" },
        { key: "location", label: "Location" },
        { key: "application_deadline", label: "Deadline" },
        { key: "status", label: "Status", render: statusBadge },
      ]}
      createRoute="/recruitment/job-postings/create"
      editRoute="/recruitment/job-postings/edit"
      showRoute="/recruitment/job-postings/show"
      searchable={true}
      searchFields={["title", "location"]}
      statusEndpoint="/recruitment/job-postings/status"
      statusOptions={[
        { value: "draft", label: "Draft" },
        { value: "published", label: "Published" },
        { value: "closed", label: "Closed" },
        { value: "archived", label: "Archived" },
      ]}
    />
  );
}
