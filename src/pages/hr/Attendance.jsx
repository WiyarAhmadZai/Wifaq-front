import CrudPage from '../../components/CrudPage';

export default function Attendance() {
  const fields = [
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'day', label: 'Day', type: 'text', required: true },
    { name: 'employee_id', label: 'Employee', type: 'text', required: true },
    { name: 'status', label: 'Status', type: 'select', required: true, options: [
      { value: 'present', label: 'Present' },
      { value: 'absent', label: 'Absent' },
      { value: 'late', label: 'Late' },
      { value: 'half_day', label: 'Half Day' },
      { value: 'leave', label: 'Leave' },
    ]},
    { name: 'expected_time', label: 'Expected Time', type: 'time', required: true },
    { name: 'arrived', label: 'Arrived', type: 'time' },
    { name: 'check_out', label: 'Check Out', type: 'time' },
    { name: 'left_without_notice', label: 'Left Without Notice', type: 'checkbox' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const listColumns = [
    { key: 'date', label: 'Date' },
    { key: 'employee_id', label: 'Employee' },
    { key: 'status', label: 'Status' },
    { key: 'arrived', label: 'Arrived' },
  ];

  return (
    <CrudPage
      title="Staff Attendance"
      apiEndpoint="/hr/attendances"
      fields={fields}
      listColumns={listColumns}
    />
  );
}
