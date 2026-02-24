import CrudPage from '../../components/CrudPage';

export const jobApplicationFields = [
  { name: 'full_name', label: 'Full Name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone', label: 'Phone', type: 'text', required: true },
  { name: 'position_applied', label: 'Position Applied', type: 'text', required: true },
  { name: 'qualification', label: 'Qualification', type: 'textarea', required: true },
  { name: 'experience', label: 'Experience', type: 'textarea', required: true },
  { name: 'expected_salary', label: 'Expected Salary', type: 'number' },
  { name: 'cv_path', label: 'CV Path', type: 'text' },
  { name: 'status', label: 'Status', type: 'select', options: [
    { value: 'new', label: 'New' },
    { value: 'reviewing', label: 'Reviewing' },
    { value: 'interview', label: 'Interview' },
    { value: 'hired', label: 'Hired' },
    { value: 'rejected', label: 'Rejected' },
  ]},
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export const jobApplicationColumns = [
  { key: 'full_name', label: 'Name' },
  { key: 'position_applied', label: 'Position' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
];

export default function JobApplication() {
  return (
    <CrudPage
      title="Job Application"
      apiEndpoint="/hr/job-applications"
      listColumns={jobApplicationColumns}
      createRoute="/hr/job-application/create"
      editRoute="/hr/job-application/edit"
      showRoute="/hr/job-application/show"
    />
  );
}
