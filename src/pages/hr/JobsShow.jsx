import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { get } from '../../api/axios';
import Swal from 'sweetalert2';

export default function JobsShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJob();
  }, [id]);

  const fetchJob = async () => {
    try {
      const response = await get(`/hr/jobs/${id}`);
      setJob(response.data?.data || response.data);
    } catch (error) {
      console.error('Fetch error:', error);
      Swal.fire('Error', 'Failed to load job details', 'error');
      navigate('/hr/jobs');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      open: 'bg-green-100 text-green-700',
      closed: 'bg-red-100 text-red-700',
      draft: 'bg-gray-100 text-gray-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const getTypeBadge = (type) => {
    const styles = {
      full_time: 'bg-blue-100 text-blue-700',
      part_time: 'bg-purple-100 text-purple-700',
      contract: 'bg-amber-100 text-amber-700',
      internship: 'bg-teal-100 text-teal-700',
    };
    return styles[type] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent mb-2"></div>
          <p className="text-gray-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Job not found</p>
        <button
          onClick={() => navigate('/hr/jobs')}
          className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          Back to Jobs
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Job Details</h2>
          <p className="text-sm text-gray-600 mt-1">View job posting information</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/hr/jobs')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          <button
            onClick={() => navigate(`/hr/jobs/edit/${id}`)}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-lg hover:bg-teal-700 transition-colors"
          >
            Edit
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6">
          {/* Header */}
          <div className="border-b border-gray-200 pb-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{job.position}</h1>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(job.status)}`}>
                    {job.status}
                  </span>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getTypeBadge(job.employment_type)}`}>
                    {job.employment_type?.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>{job.department}</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{job.location}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Key Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Seats Available</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{job.seats || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Salary Range</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{job.salary_range || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Application Deadline</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Posted Date</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {job.created_at ? new Date(job.created_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>

          {/* Job Description */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Job Description</h3>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-line">{job.description || 'No description provided'}</p>
            </div>
          </div>

          {/* Requirements */}
          {job.requirements && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Requirements</h3>
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-line">{job.requirements}</p>
              </div>
            </div>
          )}

          {/* Responsibilities */}
          {job.responsibilities && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Responsibilities</h3>
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-line">{job.responsibilities}</p>
              </div>
            </div>
          )}

          {/* Benefits */}
          {job.benefits && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Benefits</h3>
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-line">{job.benefits}</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-sm text-gray-500">
                <p>Created: {job.created_at ? new Date(job.created_at).toLocaleString() : 'N/A'}</p>
                {job.updated_at && job.updated_at !== job.created_at && (
                  <p className="mt-1">Last Updated: {new Date(job.updated_at).toLocaleString()}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/hr/jobs/edit/${id}`)}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Edit Job
                </button>
                <button
                  onClick={() => navigate('/hr/jobs')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back to List
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}