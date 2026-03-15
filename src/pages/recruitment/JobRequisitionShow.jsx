import CrudShowPage from "../../components/CrudShowPage";

const fields = [
  { name: "position_title", label: "Position Title" },
  { name: "department_id", label: "Department" },
  { name: "employment_type", label: "Employment Type" },
  { name: "number_of_positions", label: "Number of Positions" },
  { name: "justification", label: "Justification" },
  { name: "requested_by", label: "Requested By" },
  { name: "approval_status", label: "Approval Status" },
  { name: "approved_by", label: "Approved By" },
  { name: "approved_at", label: "Approved At" },
  { name: "created_at", label: "Created At" },
];

export default function JobRequisitionShow() {
  return (
    <CrudShowPage
      title="Job Requisition"
      apiEndpoint="/recruitment/job-requisitions"
      fields={fields}
      listRoute="/recruitment/job-requisitions"
      editRoute="/recruitment/job-requisitions/edit"
    />
  );
}
