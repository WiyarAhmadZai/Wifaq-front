import CrudFormPage from "../../components/CrudFormPage";

const fields = [
  { name: "position_title", label: "Position Title", type: "text", required: true },
  {
    name: "employment_type", label: "Employment Type", type: "select", required: true,
    options: [
      { value: "full_time", label: "Full Time" },
      { value: "part_time", label: "Part Time" },
      { value: "contract", label: "Contract" },
      { value: "temporary", label: "Temporary" },
      { value: "internship", label: "Internship" },
    ],
  },
  { name: "number_of_positions", label: "Number of Positions", type: "number", required: true },
  {
    name: "department_id", label: "Department", type: "search-select",
    endpoint: "/departments", valueField: "id", displayField: "name",
  },
  {
    name: "requested_by", label: "Requested By", type: "search-select",
    endpoint: "/hr/staff", valueField: "id", displayField: "full_name",
  },
  {
    name: "approval_status", label: "Approval Status", type: "select",
    options: [
      { value: "pending", label: "Pending" },
      { value: "approved", label: "Approved" },
      { value: "rejected", label: "Rejected" },
      { value: "cancelled", label: "Cancelled" },
    ],
    defaultValue: "pending",
  },
  { name: "justification", label: "Justification", type: "textarea" },
];

export default function JobRequisitionForm() {
  return (
    <CrudFormPage
      title="Job Requisition"
      apiEndpoint="/recruitment/job-requisitions"
      fields={fields}
      listRoute="/recruitment/job-requisitions"
    />
  );
}
