import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, del } from '../../../api/axios';
import Swal from 'sweetalert2';

// Mock data - in real app this would come from API
const MOCK_ASSIGNMENTS = [
  {
    id: 1,
    teacherId: 1,
    teacherName: 'Ahmad Karimi',
    subjects: ['Mathematics', 'Science'],
    levelsAbleToTeach: ['Grade 4', 'Grade 5', 'Grade 6'],
    weeklyTeachingCapacity: 30,
    notes: 'Experienced in advanced mathematics',
    status: 'active',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15'
  },
  {
    id: 2,
    teacherId: 2,
    teacherName: 'Fatima Ahmadi',
    subjects: ['English', 'Dari'],
    levelsAbleToTeach: ['Grade 1', 'Grade 2', 'Grade 3'],
    weeklyTeachingCapacity: 25,
    notes: 'Specializes in language teaching',
    status: 'active',
    createdAt: '2024-01-16',
    updatedAt: '2024-01-16'
  },
  {
    id: 3,
    teacherId: 3,
    teacherName: 'Noor Rahman',
    subjects: ['Social Studies', 'Islamic Studies'],
    levelsAbleToTeach: ['Grade 5', 'Grade 6'],
    weeklyTeachingCapacity: 35,
    notes: 'Strong in humanities subjects',
    status: 'active',
    createdAt: '2024-01-17',
    updatedAt: '2024-01-17'
  },
  {
    id: 4,
    teacherId: 4,
    teacherName: 'Maryam Sultani',
    subjects: ['Computer Science', 'Mathematics'],
    levelsAbleToTeach: ['Grade 3', 'Grade 4', 'Grade 5'],
    weeklyTeachingCapacity: 20,
    notes: 'Part-time teacher, technology specialist',
    status: 'active',
    createdAt: '2024-01-18',
    updatedAt: '2024-01-18'
  },
  {
    id: 5,
    teacherId: 5,
    teacherName: 'Khalid Noori',
    subjects: ['Physical Education', 'Art'],
    levelsAbleToTeach: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'],
    weeklyTeachingCapacity: 40,
    notes: 'Full-time physical education instructor',
    status: 'active',
    createdAt: '2024-01-19',
    updatedAt: '2024-01-19'
  }
];

const inp = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white transition-colors placeholder-gray-400 outline-none';

export default function TeacherSubjects() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      // In real app: const res = await get('/teacher-management/teacher-subjects');
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setAssignments(MOCK_ASSIGNMENTS);
    } catch (error) {
      console.error('Failed to load assignments:', error);
      Swal.fire('Error', 'Failed to load assignments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
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
      setAssignments(prev => prev.filter(a => a.id !== id));
      Swal.fire('Deleted!', 'Assignment deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete assignment:', error);
      Swal.fire('Error', 'Failed to delete assignment', 'error');
    }
  };

  // Filter assignments
  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = search === '' || 
      assignment.teacherName.toLowerCase().includes(search.toLowerCase()) ||
      assignment.subjects.some(s => s.toLowerCase().includes(search.toLowerCase()));
    
    const matchesTeacher = filterTeacher === '' || assignment.teacherName === filterTeacher;
    
    return matchesSearch && matchesTeacher;
  });

  // Get unique teacher names for filter
  const teacherNames = [...new Set(assignments.map(a => a.teacherName))];

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/teacher-management')}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-sm font-bold text-white">Teacher-Subject Assignments</h1>
              <p className="text-xs text-teal-100 mt-0.5">Manage teacher subject assignments and teaching capacity</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/teacher-management/teacher-subjects/create')}
            className="flex items-center gap-2 px-4 py-2 bg-white text-teal-600 rounded-xl hover:bg-teal-50 transition-colors text-sm font-semibold"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Assignment
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-5 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by teacher name or subject..."
                className={inp}
              />
            </div>
            <div className="sm:w-48">
              <select
                value={filterTeacher}
                onChange={(e) => setFilterTeacher(e.target.value)}
                className={inp}
              >
                <option value="">All Teachers</option>
                {teacherNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-5 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Assignments Found</h3>
            <p className="text-gray-600 mb-6">
              {search || filterTeacher ? 'Try adjusting your filters' : 'Get started by creating your first teacher-subject assignment'}
            </p>
            {!search && !filterTeacher && (
              <button
                onClick={() => navigate('/teacher-management/teacher-subjects/create')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors text-sm font-semibold"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Assignment
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredAssignments.map(assignment => (
              <div key={assignment.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                        <span className="text-teal-600 font-bold text-sm">
                          {assignment.teacherName.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{assignment.teacherName}</h3>
                        <p className="text-xs text-gray-500">ID: TS-{assignment.id.toString().padStart(4, '0')}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        assignment.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {assignment.status}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {assignment.subjects.map(subject => (
                          <span key={subject} className="px-2 py-1 bg-teal-50 text-teal-700 text-xs rounded-lg border border-teal-200 font-medium">
                            {subject}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {assignment.levelsAbleToTeach.map(level => (
                          <span key={level} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-200 font-medium">
                            {level}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{assignment.weeklyTeachingCapacity} hours/week</span>
                        </div>
                        {assignment.notes && (
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Notes</span>
                          </div>
                        )}
                      </div>
                      {assignment.notes && (
                        <p className="text-xs text-gray-600 mt-2 italic">{assignment.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => navigate(`/teacher-management/teacher-subjects/show/${assignment.id}`)}
                      className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => navigate(`/teacher-management/teacher-subjects/edit/${assignment.id}`)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Assignment"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(assignment.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Assignment"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
