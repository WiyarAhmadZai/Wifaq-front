import CrudPage from '../../components/CrudPage';

export default function AddVendor() {
  const fields = [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'category', label: 'Category', type: 'select', required: true, options: [
      { value: 'supplier', label: 'Supplier' },
      { value: 'contractor', label: 'Contractor' },
      { value: 'consultant', label: 'Consultant' },
      { value: 'other', label: 'Other' },
    ]},
    { name: 'work_type', label: 'Work Type', type: 'text', required: true },
    { name: 'contact', label: 'Contact', type: 'text', required: true },
    { name: 'address', label: 'Address', type: 'textarea', required: true },
    { name: 'quality_rating', label: 'Quality (1-5)', type: 'select', options: [
      { value: '', label: '--' },
      { value: '1', label: '1' },
      { value: '2', label: '2' },
      { value: '3', label: '3' },
      { value: '4', label: '4' },
      { value: '5', label: '5' },
    ]},
    { name: 'price_rating', label: 'Price Fair (1-5)', type: 'select', options: [
      { value: '', label: '--' },
      { value: '1', label: '1' },
      { value: '2', label: '2' },
      { value: '3', label: '3' },
      { value: '4', label: '4' },
      { value: '5', label: '5' },
    ]},
    { name: 'deadline_rating', label: 'Deadline (1-5)', type: 'select', options: [
      { value: '', label: '--' },
      { value: '1', label: '1' },
      { value: '2', label: '2' },
      { value: '3', label: '3' },
      { value: '4', label: '4' },
      { value: '5', label: '5' },
    ]},
    { name: 'response_rating', label: 'Response (1-5)', type: 'select', options: [
      { value: '', label: '--' },
      { value: '1', label: '1' },
      { value: '2', label: '2' },
      { value: '3', label: '3' },
      { value: '4', label: '4' },
      { value: '5', label: '5' },
    ]},
    { name: 'payment_terms', label: 'Payment Terms', type: 'textarea', required: true },
    { name: 'recommended_by', label: 'Recommended By', type: 'text', required: true },
    { name: 'date_engaged', label: 'Date Engaged', type: 'date', required: true },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const listColumns = [
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category' },
    { key: 'contact', label: 'Contact' },
    { key: 'date_engaged', label: 'Date Engaged' },
  ];

  return (
    <CrudPage
      title="Vendor"
      apiEndpoint="/hr/vendors"
      fields={fields}
      listColumns={listColumns}
    />
  );
}
