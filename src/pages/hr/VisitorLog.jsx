import CrudPage from '../../components/CrudPage';

export default function VisitorLog() {
  const fields = [
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'visitor_name', label: 'Visitor Name', type: 'text', required: true },
    { name: 'purpose', label: 'Purpose', type: 'text', required: true },
    { name: 'time_in', label: 'Time In', type: 'time', required: true },
    { name: 'time_out', label: 'Time Out', type: 'time' },
    { name: 'met_with', label: 'Met With', type: 'text', required: true },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const listColumns = [
    { key: 'date', label: 'Date' },
    { key: 'visitor_name', label: 'Visitor Name' },
    { key: 'purpose', label: 'Purpose' },
    { key: 'time_in', label: 'Time In' },
    { key: 'met_with', label: 'Met With' },
  ];

  return (
    <CrudPage
      title="Visitor Log"
      apiEndpoint="/hr/visitor-logs"
      fields={fields}
      listColumns={listColumns}
    />
  );
}
