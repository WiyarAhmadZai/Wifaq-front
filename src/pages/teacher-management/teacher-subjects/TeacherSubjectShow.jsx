import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { get, del } from '../../../api/axios';
import Swal from 'sweetalert2';

// Mock data - in real app this would come from API
const MOCK_ASSIGNMENTS = [
  {
    id: 1,
    teacherId: 1,
    teacherName: 'Ahmad Karimi',
    teacherEmail: 'ahmad.karimi@wifaq.edu',
    teacherPhone: '+93 70 123 4567',
    subjects: ['Mathematics', 'Science'],
    levelsAbleToTeach: ['Grade 4', 'Grade 5', 'Grade 6'],
    weeklyTeachingCapacity: 30,
    notes: 'Experienced in advanced mathematics and science curriculum. Specializes in preparing students for competitive exams.',
    status: 'active',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15'
  },
  {
    id: 2,
    teacherId: 2,
    teacherName: 'Fatima Ahmadi',
    teacherEmail: 'fatima.ahmadi@wifaq.edu',
    teacherPhone: '+93 70 234 5678',
    subjects: ['English', 'Dari'],
    levelsAbleToTeach: ['Grade 1', 'Grade 2', 'Grade 3'],
    weeklyTeachingCapacity: 25,
    notes: 'Specializes in language teaching with focus on reading comprehension and communication skills.',
    status: 'active',
    createdAt: '2024-01-16',
    updatedAt: '2024-01-16'
  },
  {
    id: 3,
    teacherId: 3,
    teacherName: 'Noor Rahman',
    teacherEmail: 'noor.rahman@wifaq.edu',
    teacherPhone: '+93 70 345 6789',
    subjects: ['Social Studies', 'Islamic Studies'],
    levelsAbleToTeach: ['Grade 5', 'Grade 6'],
    weeklyTeachingCapacity: 35,
    notes: 'Strong in humanities subjects with excellent knowledge of Afghan history and Islamic culture.',
    status: 'active',
    createdAt: '2024-01-17',
    updatedAt: '2024-01-17'
  },
  {
    id: 4,
    teacherId: 4,
    teacherName: 'Maryam Sultani',
    teacherEmail: 'maryam.sultani@wifaq.edu',
    teacherPhone: '+93 70 456 7890',
    subjects: ['Computer Science', 'Mathematics'],
    levelsAbleToTeach: ['Grade 3', 'Grade 4', 'Grade 5'],
    weeklyTeachingCapacity: 20,
    notes: 'Part-time teacher, technology specialist with background in software development.',
    status: 'active',
    createdAt: '2024-01-18',
    updatedAt: '2024-01-18'
  },
  {
    id: 5,
    teacherId: 5,
    teacherName: 'Khalid Noori',
    teacherEmail: 'khalid.noori@wifaq.edu',
    teacherPhone: '+93 70 567 8901',
    subjects: ['Physical Education', 'Art'],
    levelsAbleToTeach: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'],
    weeklyTeachingCapacity: 40,
    notes: 'Full-time physical education instructor with additional expertise in arts and crafts.',
    status: 'active',
    createdAt: '2024-01-19',
    updatedAt: '2024-01-19'
  }
];

export default function TeacherSubjectShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssignment();
  }, [id]);

  const loadAssignment = async () => {
    setLoading(true);
    try {
      // In real app: const res = await get(`/teacher-management/teacher-subjects/${id}`);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      const found = MOCK_ASSIGNMENTS.find(a => a.id == id);
      if (!found) {
        Swal.fire('Not Found', 'Assignment not found', 'error');
        navigate('/teacher-management/teacher-subjects');
        return;
      }
      setAssignment(found);
    } catch (error) {
      console.error('Failed to load assignment:', error);
      Swal.fire('Error', 'Failed to load assignment', 'error');
      navigate('/teacher-management/teacher-subjects');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: 'Delete Assignment?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      // In real app: await del(`/teacher-management/teacher-subjects/${id}`);
      Swal.fire('Deleted!', 'Assignment deleted successfully', 'success');
      navigate('/teacher-management/teacher-subjects');
    } catch (error) {
      console.error('Failed to delete assignment:', error);
      Swal.fire('Error', 'Failed to delete assignment', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="text-center py-16">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Assignment Not Found</h3>
        <p className="text-gray-600">The assignment you're looking for doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/teacher-management/teacher-subjects')}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-sm font-bold text-white">Assignment Details</h1>
              <p className="text-xs text-teal-100 mt-0.5">Teacher-Subject Assignment Information</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/teacher-management/teacher-subjects/edit/${assignment.id}`)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-teal-600 rounded-xl hover:bg-teal-50 transition-colors text-sm font-semibold"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors text-sm font-semibold"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-5 py-6 space-y-6">
        {/* Teacher Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Teacher Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Name</p>
              <p className="text-sm font-semibold text-gray-800">{assignment.teacherName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Email</p>
              <p className="text-sm text-gray-800">{assignment.teacherEmail}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Phone</p>
              <p className="text-sm text-gray-800">{assignment.teacherPhone}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Assignment ID</p>
              <p className="text-sm font-semibold text-gray-800">TS-{assignment.id.toString().padStart(4, '0')}</p>
            </div>
          </div>
        </div>

        {/* Assignment Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Assignment Details
          </h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Subjects Assigned</p>
              <div className="flex flex-wrap gap-2">
                {assignment.subjects.map(subject => (
                  <span key={subject} className="px-3 py-1.5 bg-teal-50 text-teal-700 text-sm rounded-lg border border-teal-200 font-medium">
                    {subject}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Grade Levels Able to Teach</p>
              <div className="flex flex-wrap gap-2">
                {assignment.levelsAbleToTeach.map(level => (
                  <span key={level} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-lg border border-blue-200 font-medium">
                    {level}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Weekly Teaching Capacity</p>
                <div className="flex items-center gap-2">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    assignment.weeklyTeachingCapacity >= 35 ? 'bg-green-100 text-green-700' :
                    assignment.weeklyTeachingCapacity >= 25 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    <span className="font-bold text-sm">{assignment.weeklyTeachingCapacity}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{assignment.weeklyTeachingCapacity} hours/week</p>
                    <p className="text-xs text-gray-500">
                      {assignment.weeklyTeachingCapacity >= 35 ? 'Full-time' :
                       assignment.weeklyTeachingCapacity >= 25 ? 'Part-time' : 'Limited'}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</p>
                <span className={`inline-flex items-center px-3 py-1.5 text-sm font-semibold rounded-lg ${
                  assignment.status === 'active' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  <span className={`w-2 h-2 rounded-full mr-2 ${
                    assignment.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
                  }`} />
                  {assignment.status}
                </span>
              </div>
            </div>

            {assignment.notes && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Notes</p>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-700 italic">{assignment.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Timeline
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">Assignment Created</p>
                <p className="text-xs text-gray-500">{new Date(assignment.createdAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>
            </div>
            {assignment.updatedAt !== assignment.createdAt && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">Last Updated</p>
                  <p className="text-xs text-gray-500">{new Date(assignment.updatedAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-6">
          <div className="text-sm text-gray-600">
            Assignment ID: TS-{assignment.id.toString().padStart(4, '0')}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/teacher-management/teacher-subjects')}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors text-sm font-semibold"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to List
            </button>
            <button
              onClick={() => navigate(`/teacher-management/teacher-subjects/edit/${assignment.id}`)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors text-sm font-semibold"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Assignment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
