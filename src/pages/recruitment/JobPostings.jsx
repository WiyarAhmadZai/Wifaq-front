import CrudPage from "../../components/CrudPage";

const statusBadge = (val, item, onClick) => (
  <button
    onClick={() => onClick && onClick(item)}
    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer hover:opacity-80 transition-opacity ${
      val === "published" ? "bg-emerald-100 text-emerald-700" :
      val === "draft" ? "bg-amber-100 text-amber-700" :
      val === "closed" ? "bg-red-100 text-red-700" :
      val === "archived" ? "bg-gray-100 text-gray-700" :
      "bg-gray-100 text-gray-700"
    }`}
  >
    {val?.replace(/_/g, " ")}
  </button>
);

export default function JobPostings() {
  return (
    <CrudPage
      permissionBase="job-postings"
      title="Job Postings"
      apiEndpoint="/recruitment/job-postings"
      listColumns={[
        { key: "title", label: "Title" },
        { key: "requisition_id", label: "Requisition", render: (val, item) => item.requisition?.position_title || val },
        { key: "location", label: "Location" },
        { key: "status", label: "Status", render: statusBadge, isStatus: true },
      ]}
      createRoute="/recruitment/job-postings/create"
      editRoute="/recruitment/job-postings/edit"
      showRoute="/recruitment/job-postings/show"
      searchable={true}
      searchFields={["title", "location"]}
      statusEndpoint="/recruitment/job-postings"
      statusField="status"
      statusOptions={[
        { value: "draft", label: "Draft" },
        { value: "published", label: "Published" },
        { value: "closed", label: "Closed" },
        { value: "archived", label: "Archived" },
      ]}
    />
  );
}
