import CrudPage from '../../components/CrudPage';

export default function StaffTask() {
  const fields = [
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'staff_name', label: 'Staff Name', type: 'text', required: true },
    { name: 'task', label: 'Task', type: 'textarea', required: true },
    { name: 'status', label: 'Status', type: 'select', options: [
      { value: 'pending', label: 'Pending' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
    ]},
    { name: 'started', label: 'Started', type: 'time' },
    { name: 'completed', label: 'Completed', type: 'time' },
    { name: 'quality', label: 'Quality', type: 'select', options: [
      { value: '', label: '--' },
      { value: 'excellent', label: 'Excellent' },
      { value: 'good', label: 'Good' },
      { value: 'average', label: 'Average' },
      { value: 'poor', label: 'Poor' },
    ]},
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const listColumns = [
    { key: 'date', label: 'Date' },
    { key: 'staff_name', label: 'Staff Name' },
    { key: 'task', label: 'Task' },
    { key: 'status', label: 'Status' },
  ];

  return (
    <CrudPage
      title="Staff Task"
      apiEndpoint="/hr/staff-tasks"
      fields={fields}
      listColumns={listColumns}
    />
  );
}
