import CrudFormPage from '../../components/CrudFormPage';
import { jobApplicationFields } from './JobApplication';

export default function JobApplicationForm() {
  return (
    <CrudFormPage
      title="Job Application"
      apiEndpoint="/hr/job-applications"
      fields={jobApplicationFields}
      listRoute="/hr/job-application"
    />
  );
}
