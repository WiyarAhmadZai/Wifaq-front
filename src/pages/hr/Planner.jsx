import CrudPage from '../../components/CrudPage';

export default function Planner() {
  const fields = [
    { name: 'type', label: 'Type', type: 'select', required: true, options: [
      { value: 'task', label: 'Task' },
      { value: 'meeting', label: 'Meeting' },
      { value: 'event', label: 'Event' },
    ]},
    { name: 'name', label: 'Your Name', type: 'text', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'day', label: 'Day', type: 'text', required: true },
    { name: 'time', label: 'Time', type: 'time', required: true },
    { name: 'description', label: 'Description', type: 'textarea', required: true },
    { name: 'event_type', label: 'Event Type', type: 'text' },
    { name: 'target_audience', label: 'Target Audience', type: 'text' },
    { name: 'location', label: 'Location', type: 'text' },
    { name: 'branch', label: 'Branch', type: 'text', required: true },
    { name: 'attendance', label: 'Attendance', type: 'select', options: [
      { value: 'optional', label: 'Optional' },
      { value: 'mandatory', label: 'Mandatory' },
    ]},
    { name: 'notify_emails', label: 'Notify Emails', type: 'textarea' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const listColumns = [
    { key: 'type', label: 'Type' },
    { key: 'name', label: 'Name' },
    { key: 'date', label: 'Date' },
    { key: 'time', label: 'Time' },
    { key: 'branch', label: 'Branch' },
  ];

  return (
    <CrudPage
      title="Planner"
      apiEndpoint="/hr/planners"
      fields={fields}
      listColumns={listColumns}
    />
  );
}
