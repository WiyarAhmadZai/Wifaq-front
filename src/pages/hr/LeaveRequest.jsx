import CrudPage from '../../components/CrudPage';

export const leaveRequestFields = [
  { name: 'school', label: 'School', type: 'text', required: true },
  { name: 'leave_type', label: 'Leave Type', type: 'select', required: true, options: [
    { value: 'sick', label: 'Sick' },
    { value: 'casual', label: 'Casual' },
    { value: 'annual', label: 'Annual' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'other', label: 'Other' },
  ]},
  { name: 'from_date', label: 'From Date', type: 'date', required: true },
  { name: 'to_date', label: 'To Date', type: 'date', required: true },
  { name: 'total_days', label: 'Total Days', type: 'number', required: true },
  { name: 'reason', label: 'Reason', type: 'textarea', required: true },
  { name: 'coverage_plan', label: 'Coverage Plan', type: 'textarea', required: true },
];

export const leaveRequestColumns = [
  { key: 'school', label: 'School' },
  { key: 'leave_type', label: 'Type' },
  { key: 'from_date', label: 'From' },
  { key: 'to_date', label: 'To' },
  { key: 'total_days', label: 'Days' },
];

export default function LeaveRequest() {
  return (
    <CrudPage
      title="Leave Request"
      apiEndpoint="/hr/leave-requests"
      listColumns={leaveRequestColumns}
      createRoute="/hr/leave-request/create"
      editRoute="/hr/leave-request/edit"
      showRoute="/hr/leave-request/show"
    />
  );
}
