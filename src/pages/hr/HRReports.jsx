import { useState, useEffect } from 'react';
import { get } from '../../api/axios';
import { Link } from 'react-router-dom';

const Icons = {
  Users: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  CheckCircle: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Briefcase: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  FileText: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  CheckSquare: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  CreditCard: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  TrendingUp: () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  TrendingDown: () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
  ),
};

const StatCard = ({ icon: Icon, title, value, trend, trendUp, color }) => (
  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
    <div className="flex items-start justify-between">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
        <Icon />
      </div>
    </div>
    <div className="mt-4">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
      {trend && (
        <p className={`text-xs flex items-center gap-1 mt-1 ${trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
          {trendUp ? <Icons.TrendingUp /> : <Icons.TrendingDown />}
          {trend}
        </p>
      )}
    </div>
  </div>
);

const ProgressBar = ({ label, value, total, color = 'bg-teal-600' }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-800">{value}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
};

const CircularProgress = ({ percentage, size = 60 }) => {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-teal-600"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-gray-800">{percentage}%</span>
      </div>
    </div>
  );
};

const ModuleCard = ({ title, subtitle, icon: Icon, children, actionText, actionLink }) => (
  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
        <Icon />
      </div>
    </div>
    {children}
    <Link
      to={actionLink}
      className="block w-full mt-4 py-2 text-center text-sm font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
    >
      {actionText}
    </Link>
  </div>
);

export default function HRReports() {
  const [stats, setStats] = useState({
    totalStaff: 0,
    attendance: 0,
    pendingLeave: 0,
    openVacancies: 0,
    attendanceData: [],
    leaveData: [],
    jobData: [],
    vendorData: [],
    purchaseData: [],
    taskData: [],
    plannerData: [],
    visitorData: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [
        attendanceRes,
        leaveRes,
        jobRes,
        vendorRes,
        purchaseRes,
        taskRes,
        plannerRes,
        visitorRes,
      ] = await Promise.all([
        get('/hr/attendances'),
        get('/hr/leave-requests'),
        get('/hr/job-applications'),
        get('/hr/vendors'),
        get('/hr/purchase-requests'),
        get('/hr/staff-tasks'),
        get('/hr/planners'),
        get('/hr/visitor-logs'),
      ]);

      const attendanceData = attendanceRes.data?.data || attendanceRes.data || [];
      const leaveData = leaveRes.data?.data || leaveRes.data || [];
      const jobData = jobRes.data?.data || jobRes.data || [];
      const vendorData = vendorRes.data?.data || vendorRes.data || [];
      const purchaseData = purchaseRes.data?.data || purchaseRes.data || [];
      const taskData = taskRes.data?.data || taskRes.data || [];
      const plannerData = plannerRes.data?.data || plannerRes.data || [];
      const visitorData = visitorRes.data?.data || visitorRes.data || [];

      const presentToday = attendanceData.filter(a => a.status === 'present' || a.status === 'Present').length;
      const attendanceRate = attendanceData.length > 0 ? Math.round((presentToday / attendanceData.length) * 100) : 0;
      const pendingLeaveCount = leaveData.filter(l => l.status === 'pending' || l.status === 'Pending').length;
      const openJobs = jobData.filter(j => j.status === 'new' || j.status === 'in_progress' || j.status === 'New' || j.status === 'In Progress').length;

      setStats({
        totalStaff: attendanceData.length || 0,
        attendance: attendanceRate,
        pendingLeave: pendingLeaveCount,
        openVacancies: openJobs,
        attendanceData,
        leaveData,
        jobData,
        vendorData,
        purchaseData,
        taskData,
        plannerData,
        visitorData,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setStats({
        totalStaff: 0,
        attendance: 0,
        pendingLeave: 0,
        openVacancies: 0,
        attendanceData: [],
        leaveData: [],
        jobData: [],
        vendorData: [],
        purchaseData: [],
        taskData: [],
        plannerData: [],
        visitorData: [],
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const approvedLeave = stats.leaveData?.filter(l => l.status === 'approved' || l.status === 'Approved').length || 0;
  const pendingLeaveCount = stats.leaveData?.filter(l => l.status === 'pending' || l.status === 'Pending').length || 0;
  const rejectedLeave = stats.leaveData?.filter(l => l.status === 'rejected' || l.status === 'Rejected').length || 0;
  const totalLeave = approvedLeave + pendingLeaveCount + rejectedLeave || 1;
  const leaveApprovalRate = totalLeave > 0 ? Math.round((approvedLeave / totalLeave) * 100) : 0;

  const completedTasks = stats.taskData?.filter(t => t.status === 'completed' || t.status === 'Completed').length || 0;
  const inProgressTasks = stats.taskData?.filter(t => t.status === 'in_progress' || t.status === 'In Progress').length || 0;
  const totalTasks = stats.taskData?.length || 1;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const applications = stats.jobData?.length || 0;
  const shortlisted = stats.jobData?.filter(j => j.status === 'shortlisted' || j.status === 'Shortlisted').length || 0;
  const interviewing = stats.jobData?.filter(j => j.status === 'interviewing' || j.status === 'Interviewing').length || 0;
  const hired = stats.jobData?.filter(j => j.status === 'hired' || j.status === 'Hired').length || 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">HR Management Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Welcome back, Admin. Here is today's overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <StatCard
          icon={Icons.Users}
          title="Total Staff"
          value={stats.totalStaff}
          trend="+2.4%"
          trendUp={true}
          color="bg-teal-100 text-teal-600"
        />
        <StatCard
          icon={Icons.CheckCircle}
          title="Attendance"
          value={`${stats.attendance}%`}
          trend="+1.2%"
          trendUp={true}
          color="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          icon={Icons.Calendar}
          title="Pending Leave"
          value={stats.pendingLeave}
          trend="-5%"
          trendUp={false}
          color="bg-amber-100 text-amber-600"
        />
        <StatCard
          icon={Icons.Briefcase}
          title="Open Vacancies"
          value={stats.openVacancies}
          trend="Stable"
          trendUp={true}
          color="bg-rose-100 text-rose-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Weekly Attendance */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-800">Weekly Attendance</h3>
            <select className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white">
              <option>This Week</option>
              <option>Last Week</option>
            </select>
          </div>
          <div className="h-40 flex items-end justify-between gap-3">
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, i) => {
              const height = [60, 75, 85, 70, 90, 40, 30][i];
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-teal-100 rounded-t-lg transition-all duration-500 hover:bg-teal-200" style={{ height: `${height}%` }}></div>
                  <span className="text-xs text-gray-500 font-medium">{day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recruitment Pipeline */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Recruitment Pipeline</h3>
          <ProgressBar label="Applications" value={applications} total={applications || 1} color="bg-teal-700" />
          <ProgressBar label="Shortlisted" value={shortlisted} total={applications || 1} color="bg-teal-600" />
          <ProgressBar label="Interviewing" value={interviewing} total={applications || 1} color="bg-teal-500" />
          <ProgressBar label="Hired" value={hired} total={applications || 1} color="bg-amber-500" />
        </div>
      </div>

      {/* Module Quick View */}
      <h3 className="text-base font-semibold text-gray-800 mb-4">Module Quick View</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Leave Requests */}
        <ModuleCard
          title="Leave Requests"
          subtitle={`${pendingLeaveCount} Pending today`}
          icon={Icons.FileText}
          actionText="View Report"
          actionLink="/hr/leave-request"
        >
          <div className="flex items-center gap-4">
            <CircularProgress percentage={leaveApprovalRate} size={60} />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-xs text-gray-600">Approved ({approvedLeave})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span className="text-xs text-gray-600">Pending ({pendingLeaveCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                <span className="text-xs text-gray-600">Rejected ({rejectedLeave})</span>
              </div>
            </div>
          </div>
        </ModuleCard>

        {/* Staff Tasks */}
        <ModuleCard
          title="Staff Tasks"
          subtitle="Weekly Progress"
          icon={Icons.CheckSquare}
          actionText="Manage Tasks"
          actionLink="/hr/staff-task"
        >
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-gray-600 font-medium">COMPLETED TASKS</span>
                <span className="text-gray-800 font-semibold">{completedTasks}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-teal-600 rounded-full transition-all duration-500" style={{ width: `${taskCompletionRate}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-gray-600 font-medium">IN PROGRESS</span>
                <span className="text-gray-800 font-semibold">{inProgressTasks}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${(inProgressTasks / totalTasks) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </ModuleCard>

        {/* Vendors & Orders */}
        <ModuleCard
          title="Vendors & Orders"
          subtitle="Recent Activity"
          icon={Icons.CreditCard}
          actionText="Vendor Log"
          actionLink="/hr/add-vendor"
        >
          <div className="space-y-3">
            {stats.vendorData?.slice(0, 2).map((vendor, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${i === 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                  {i === 0 ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="text-sm font-bold">$</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{vendor.company_name || vendor.name}</p>
                  <p className="text-xs text-gray-500">{i === 0 ? 'Invoice Paid' : 'Pending Approval'}</p>
                </div>
              </div>
            ))}
            {(!stats.vendorData || stats.vendorData.length === 0) && (
              <>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">Paper Supplies Ltd</p>
                    <p className="text-xs text-gray-500">Invoice Paid - $1,200</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                    <span className="text-sm font-bold">$</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">Tech World IT</p>
                    <p className="text-xs text-gray-500">Pending Approval - $4,500</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </ModuleCard>
      </div>
    </div>
  );
}
