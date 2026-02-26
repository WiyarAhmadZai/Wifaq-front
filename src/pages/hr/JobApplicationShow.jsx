import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get } from '../../api/axios';
import Swal from 'sweetalert2';

export default function JobApplicationShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplication();
  }, [id]);

  const fetchApplication = async () => {
    try {
      const response = await get(`/hr/job-applications/${id}`);
      setApplication(response.data);
    } catch (error) {
      console.error('Error fetching application:', error);
      Swal.fire('Error', 'Failed to load job application', 'error');
      navigate('/hr/job-application');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-gray-500">Application not found</p>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="w-full px-4 py-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Job Application Details</h2>
            <p className="text-xs text-gray-500 mt-1">ID: {application.id}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/hr/job-application/edit/${application.id}`)}
              className="px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-xs font-medium"
            >
              Edit
            </button>
            <button
              onClick={() => navigate('/hr/job-application')}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-xs font-medium"
            >
              Back to List
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-2">Basic Information</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Full Name:</span>
                  <p className="font-medium">{application.full_name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>
                  <p className="font-medium">{application.email}</p>
                </div>
                <div>
                  <span className="text-gray-500">Phone:</span>
                  <p className="font-medium">{application.phone}</p>
                </div>
                <div>
                  <span className="text-gray-500">Position Applied:</span>
                  <p className="font-medium">{application.position_applied}</p>
                </div>
                <div>
                  <span className="text-gray-500">Expected Salary:</span>
                  <p className="font-medium">{application.expected_salary ? `$${parseFloat(application.expected_salary).toFixed(2)}` : 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    application.status === 'new' ? 'bg-blue-100 text-blue-700' :
                    application.status === 'reviewing' ? 'bg-yellow-100 text-yellow-700' :
                    application.status === 'interview' ? 'bg-purple-100 text-purple-700' :
                    application.status === 'hired' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {application.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-2">Additional Information</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Qualification:</span>
                  <p className="font-medium">{application.qualification}</p>
                </div>
                <div>
                  <span className="text-gray-500">Experience:</span>
                  <p className="font-medium">{application.experience}</p>
                </div>
                <div>
                  <span className="text-gray-500">Notes:</span>
                  <p className="font-medium">{application.notes || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-500">CV:</span>
                  {application.cv_path ? (
                    <a 
                      href={`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/storage/${application.cv_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-600 hover:text-teal-800 underline text-sm"
                    >
                      Download CV
                    </a>
                  ) : (
                    <p className="font-medium">No CV uploaded</p>
                  )}
                </div>
                <div>
                  <span className="text-gray-500">Created:</span>
                  <p className="font-medium">{formatDate(application.created_at)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Updated:</span>
                  <p className="font-medium">{formatDate(application.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
