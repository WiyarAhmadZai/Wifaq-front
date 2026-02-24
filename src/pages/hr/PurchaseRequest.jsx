import CrudPage from '../../components/CrudPage';

export default function PurchaseRequest() {
  const fields = [
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'branch', label: 'Branch', type: 'text', required: true },
    { name: 'category', label: 'Category', type: 'text', required: true },
    { name: 'urgency', label: 'Urgency', type: 'select', required: true, options: [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
    ]},
    { name: 'item', label: 'Item', type: 'text', required: true },
    { name: 'quantity', label: 'Quantity', type: 'number', required: true },
    { name: 'reason', label: 'Reason', type: 'textarea', required: true },
    { name: 'estimated_cost', label: 'Est. Cost (AFN)', type: 'number' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const listColumns = [
    { key: 'date', label: 'Date' },
    { key: 'branch', label: 'Branch' },
    { key: 'item', label: 'Item' },
    { key: 'urgency', label: 'Urgency' },
    { key: 'status', label: 'Status' },
  ];

  return (
    <CrudPage
      title="Purchase Request"
      apiEndpoint="/hr/purchase-requests"
      fields={fields}
      listColumns={listColumns}
    />
  );
}
