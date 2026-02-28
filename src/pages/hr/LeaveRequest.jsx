import CrudPage from '../../components/CrudPage';

export const leaveRequestFields = [
  { name: 'staff_id', label: 'Staff', type: 'search-select', required: true, endpoint: '/hr/staff/list?per_page=1000', displayField: 'full_name', valueField: 'id' },
  { name: 'leave_type', label: 'Leave Type', type: 'select', required: true, options: [
    { value: 'sick', label: 'Sick' },
    { value: 'casual', label: 'Casual' },
    { value: 'annual', label: 'Annual' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'other', label: 'Other' },
  ]},
  { name: 'from_date', label: 'From Date', type: 'date', required: true, defaultValue: new Date().toISOString().split('T')[0] },
  { name: 'to_date', label: 'To Date', type: 'date', required: false },
  { name: 'total_days', label: 'Total Days', type: 'number', required: true },
  { name: 'reason', label: 'Reason', type: 'textarea', required: true, conditional: { field: 'leave_type', value: 'other' } },
  { name: 'coverage_plan', label: 'Coverage Plan', type: 'textarea', required: true },
];

export const leaveRequestColumns = [
  { key: 'staff.full_name', label: 'Staff' },
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