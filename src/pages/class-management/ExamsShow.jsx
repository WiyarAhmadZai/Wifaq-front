import { useNavigate, useParams } from 'react-router-dom';

const getStatusBadge = (status) => ({ 
  scheduled: 'bg-blue-100 text-blue-700', 
  upcoming: 'bg-amber-100 text-amber-700', 
  completed: 'bg-emerald-100 text-emerald-700',
  in_progress: 'bg-purple-100 text-purple-700'
}[status] || 'bg-gray-100 text-gray-700');

export default function ExamsShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const item = { 
    id: 1, 
    examName: 'Mid Term Mathematics Exam', 
    examType: 'Mid Term Exam', 
    className: 'Class 1-A', 
    subject: 'Mathematics', 
    teacher: 'Mr. Ahmad Khan',
    examDate: '2025-03-15', 
    startTime: '09:00 AM', 
    endTime: '11:00 AM',
    totalMarks: '100', 
    passingMarks: '40', 
    status: 'scheduled' 
  };

  const InfoRow = ({ label, value, highlight = false }) => (
    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-sm ${highlight ? 'font-bold text-teal-600' : 'font-medium text-gray-800'}`}>{value || '—'}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/class-management/exams')} 
              className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-sm font-bold text-white">Exam Details</h1>
              <p className="text-xs text-teal-100 mt-0.5">View examination information</p>
            </div>
          </div>
          <button onClick={() => navigate(`/class-management/exams/edit/${id}`)} 
            className="px-4 py-2 bg-white text-teal-600 rounded-xl hover:bg-teal-50 transition-colors flex items-center gap-2 font-semibold text-xs shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Exam
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Quick Info Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-800 mb-1">{item.examName}</h2>
              <p className="text-xs text-gray-500">{item.examType}</p>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-[10px] font-semibold ${getStatusBadge(item.status)}`}>
              {item.status.toUpperCase()}
            </span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-gray-100">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Class</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5">{item.className}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Subject</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5">{item.subject}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Teacher</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5">{item.teacher}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Date</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5">{item.examDate}</p>
            </div>
          </div>
        </div>

        {/* Detailed Information */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4">Examination Details</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <InfoRow label="Exam Name" value={item.examName} highlight />
            <InfoRow label="Exam Type" value={item.examType} />
            <InfoRow label="Class" value={item.className} />
            <InfoRow label="Subject" value={item.subject} />
            <InfoRow label="Teacher" value={item.teacher} />
            <InfoRow label="Exam Date" value={item.examDate} />
            <InfoRow label="Start Time" value={item.startTime} />
            <InfoRow label="End Time" value={item.endTime} />
            <InfoRow label="Total Marks" value={item.totalMarks} highlight />
            <InfoRow label="Passing Marks" value={item.passingMarks} highlight />
            <InfoRow label="Duration" value={`${((new Date(`2000-01-01 ${item.endTime}`) - new Date(`2000-01-01 ${item.startTime}`)) / 60000).toFixed(0)} minutes`} />
            <InfoRow label="Status" value={<span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${getStatusBadge(item.status)}`}>{item.status}</span>} />
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-4 bg-blue-50 rounded-2xl border border-blue-100 p-5">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-xs font-bold text-blue-800 mb-1">Important Information</h4>
              <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                <li>Please arrive 15 minutes before the exam start time</li>
                <li>Bring your student ID and necessary stationery</li>
                <li>Total duration: {((new Date(`2000-01-01 ${item.endTime}`) - new Date(`2000-01-01 ${item.startTime}`)) / 60000).toFixed(0)} minutes</li>
                <li>Passing marks required: {item.passingMarks} out of {item.totalMarks}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}