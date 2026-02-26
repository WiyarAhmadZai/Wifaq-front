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
    activeStaff: 0,
    onLeaveStaff: 0,
    activeContracts: 0,
    draftContracts: 0,
    expiringSoon: 0,
    staffData: [],
    contractsData: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [staffRes, contractsRes] = await Promise.all([
        get('/hr/staff/list'),
        get('/hr/contracts/list'),
      ]);

      const staffData = staffRes.data?.data || staffRes.data || [];
      const contractsData = contractsRes.data?.data || contractsRes.data || [];

      // Calculate stats from staff data
      const totalStaff = Array.isArray(staffData) ? staffData.length : 0;
      const activeStaff = staffData.filter(s => s.status === 'active').length;
      const onLeaveStaff = staffData.filter(s => s.status === 'on_leave').length;
      
      // Calculate stats from contracts data
      const activeContracts = contractsData.filter(c => c.status === 'active').length;
      const draftContracts = contractsData.filter(c => c.status === 'draft').length;
      const expiringSoon = contractsData.filter(c => {
        if (!c.end_date) return false;
        const endDate = new Date(c.end_date);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        return endDate <= thirtyDaysFromNow && endDate >= new Date();
      }).length;

      setStats({
        totalStaff,
        activeStaff,
        onLeaveStaff,
        activeContracts,
        draftContracts,
        expiringSoon,
        staffData: Array.isArray(staffData) ? staffData : [],
        contractsData: Array.isArray(contractsData) ? contractsData : [],
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setStats({
        totalStaff: 0,
        activeStaff: 0,
        onLeaveStaff: 0,
        activeContracts: 0,
        draftContracts: 0,
        expiringSoon: 0,
        staffData: [],
        contractsData: [],
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

  // Calculate staff stats
  const activeStaffCount = stats.activeStaff || 0;
  const onLeaveCount = stats.onLeaveStaff || 0;
  const inactiveStaff = (stats.totalStaff || 0) - activeStaffCount - onLeaveCount;
  const totalStaff = stats.totalStaff || 1;
  const activeRate = totalStaff > 0 ? Math.round((activeStaffCount / totalStaff) * 100) : 0;

  // Calculate contract stats
  const activeContracts = stats.activeContracts || 0;
  const draftContracts = stats.draftContracts || 0;
  const expiringSoon = stats.expiringSoon || 0;
  const totalContracts = (stats.contractsData?.length || 0) || 1;
  const contractActivationRate = totalContracts > 0 ? Math.round((activeContracts / totalContracts) * 100) : 0;

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
          trend="Active"
          trendUp={true}
          color="bg-teal-100 text-teal-600"
        />
        <StatCard
          icon={Icons.CheckCircle}
          title="Active Staff"
          value={activeStaffCount}
          trend={`${activeRate}%`}
          trendUp={true}
          color="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          icon={Icons.Calendar}
          title="On Leave"
          value={onLeaveCount}
          trend="Current"
          trendUp={false}
          color="bg-amber-100 text-amber-600"
        />
        <StatCard
          icon={Icons.Briefcase}
          title="Active Contracts"
          value={activeContracts}
          trend={`${contractActivationRate}%`}
          trendUp={true}
          color="bg-rose-100 text-rose-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Staff Overview Chart */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-800">Staff Overview</h3>
            <span className="text-xs text-gray-500">Current Status</span>
          </div>
          <div className="h-40 flex items-end justify-between gap-3">
            {[
              { label: 'Total', value: stats.totalStaff, color: 'bg-teal-600' },
              { label: 'Active', value: activeStaffCount, color: 'bg-emerald-500' },
              { label: 'On Leave', value: onLeaveCount, color: 'bg-amber-500' },
              { label: 'Inactive', value: inactiveStaff, color: 'bg-gray-400' },
            ].map((item) => {
              const maxValue = Math.max(stats.totalStaff || 1, 1);
              const height = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
              return (
                <div key={item.label} className="flex-1 flex flex-col items-center gap-2">
                  <div className={`w-full ${item.color} rounded-t-lg transition-all duration-500`} style={{ height: `${Math.max(height, 5)}%` }}></div>
                  <span className="text-xs text-gray-500 font-medium">{item.label}</span>
                  <span className="text-xs font-bold text-gray-700">{item.value}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Staff Status Overview */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Staff Status Overview</h3>
          <ProgressBar label="Active Staff" value={activeStaffCount} total={totalStaff} color="bg-teal-700" />
          <ProgressBar label="On Leave" value={onLeaveCount} total={totalStaff} color="bg-amber-500" />
          <ProgressBar label="Inactive" value={inactiveStaff} total={totalStaff} color="bg-gray-400" />
          <ProgressBar label="Total Staff" value={stats.totalStaff} total={stats.totalStaff || 1} color="bg-teal-500" />
        </div>
      </div>

      {/* Module Quick View */}
      <h3 className="text-base font-semibold text-gray-800 mb-4">Module Quick View</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Staff Overview */}
        <ModuleCard
          title="Staff Overview"
          subtitle={`${activeStaffCount} Active, ${onLeaveCount} On Leave`}
          icon={Icons.Users}
          actionText="View Staff"
          actionLink="/hr/staff"
        >
          <div className="flex items-center gap-4">
            <CircularProgress percentage={activeRate} size={60} />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-xs text-gray-600">Active ({activeStaffCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span className="text-xs text-gray-600">On Leave ({onLeaveCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                <span className="text-xs text-gray-600">Inactive ({inactiveStaff})</span>
              </div>
            </div>
          </div>
        </ModuleCard>

        {/* Contracts Overview */}
        <ModuleCard
          title="Contracts Overview"
          subtitle={`${expiringSoon} Expiring Soon`}
          icon={Icons.FileText}
          actionText="View Contracts"
          actionLink="/hr/contracts"
        >
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-gray-600 font-medium">ACTIVE CONTRACTS</span>
                <span className="text-gray-800 font-semibold">{activeContracts}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-teal-600 rounded-full transition-all duration-500" style={{ width: `${contractActivationRate}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-gray-600 font-medium">DRAFT CONTRACTS</span>
                <span className="text-gray-800 font-semibold">{draftContracts}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${(draftContracts / totalContracts) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </ModuleCard>

        {/* Recent Staff */}
        <ModuleCard
          title="Recent Staff"
          subtitle="Latest additions"
          icon={Icons.CheckSquare}
          actionText="Manage Staff"
          actionLink="/hr/staff"
        >
          <div className="space-y-3">
            {stats.staffData?.slice(0, 3).map((staff, i) => (
              <div key={staff.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 flex-shrink-0 text-xs font-bold">
                  {staff.full_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{staff.full_name}</p>
                  <p className="text-xs text-gray-500">{staff.designation || staff.department || 'Staff'}</p>
                </div>
              </div>
            ))}
            {(!stats.staffData || stats.staffData.length === 0) && (
              <p className="text-xs text-gray-500">No staff members yet</p>
            )}
          </div>
        </ModuleCard>
      </div>
    </div>
  );
}
