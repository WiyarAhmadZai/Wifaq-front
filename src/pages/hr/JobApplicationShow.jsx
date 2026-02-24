import CrudShowPage from '../../components/CrudShowPage';
import { jobApplicationFields } from './JobApplication';

export default function JobApplicationShow() {
  return (
    <CrudShowPage
      title="Job Application"
      apiEndpoint="/hr/job-applications"
      fields={jobApplicationFields}
      listRoute="/hr/job-application"
      editRoute="/hr/job-application/edit"
    />
  );
}
