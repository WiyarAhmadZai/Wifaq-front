import { useState, useEffect } from 'react';
import { get } from '../api/axios';

// Icons as components
const Icons = {
  Dashboard: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  Departments: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  Payroll: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Leave: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Puzzle: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
    </svg>
  ),
  Settings: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Support: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Search: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Bell: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  Logout: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  Money: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Game: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Users: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  Shield: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Bolt: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  AddUser: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  ),
  Upload: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
  Report: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Notice: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  ),
};

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
      active
        ? 'bg-teal-700 text-white'
        : 'text-teal-100 hover:bg-teal-800 hover:text-white'
    }`}
  >
    <Icon />
    <span className="font-medium">{label}</span>
  </button>
);

const MenuSection = ({ title }) => (
  <div className="px-4 py-2 text-xs font-semibold text-teal-400 uppercase tracking-wider">
    {title}
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = {
    Optimal: 'bg-emerald-100 text-emerald-700',
    Understaffed: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || styles.Optimal}`}>
      {status}
    </span>
  );
};

const LeaveRequestItem = ({ name, type, days, status }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-sm font-medium">
        {name.charAt(0)}
      </div>
      <div>
        <p className="font-medium text-gray-800 text-sm">{name}</p>
        <p className="text-xs text-gray-500">{type} • {days}</p>
      </div>
    </div>
    {status === 'approved' && (
      <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    )}
  </div>
);

const NumberPuzzleCell = ({ number, empty }) => (
  <div className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-semibold ${
    empty ? 'bg-gray-100' : 'bg-white border border-gray-200 shadow-sm'
  }`}>
    {number}
  </div>
);

const QuickActionButton = ({ icon: Icon, label }) => (
  <button className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-teal-500 hover:bg-teal-50 transition-colors">
    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
      <Icon />
    </div>
    <span className="text-xs font-medium text-gray-600 uppercase">{label}</span>
  </button>
);

export default function Dashboard() {
  const [apiStatus, setApiStatus] = useState('Checking...');
  const [activeMenu, setActiveMenu] = useState('Dashboard');

  useEffect(() => {
    const testApi = async () => {
      try {
        const response = await get('/test');
        setApiStatus(response.data.message);
      } catch (error) {
        setApiStatus('API Error: ' + (error.message || 'Unknown error'));
      }
    };
    testApi();
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-teal-800 flex flex-col">
        {/* Logo */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">Wifaq School</h1>
            <p className="text-teal-300 text-xs uppercase tracking-wider">Admin Portal</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          <MenuSection title="Main Menu" />
          <SidebarItem
            icon={Icons.Dashboard}
            label="Dashboard"
            active={activeMenu === 'Dashboard'}
            onClick={() => setActiveMenu('Dashboard')}
          />
          <SidebarItem
            icon={Icons.Departments}
            label="Departments"
            active={activeMenu === 'Departments'}
            onClick={() => setActiveMenu('Departments')}
          />

          <MenuSection title="Operations" />
          <SidebarItem
            icon={Icons.Payroll}
            label="Payroll"
            active={activeMenu === 'Payroll'}
            onClick={() => setActiveMenu('Payroll')}
          />
          <SidebarItem
            icon={Icons.Leave}
            label="Leave Requests"
            active={activeMenu === 'Leave Requests'}
            onClick={() => setActiveMenu('Leave Requests')}
          />
          <SidebarItem
            icon={Icons.Puzzle}
            label="Number Puzzle"
            active={activeMenu === 'Number Puzzle'}
            onClick={() => setActiveMenu('Number Puzzle')}
          />

          <MenuSection title="System" />
          <SidebarItem
            icon={Icons.Settings}
            label="Settings"
            active={activeMenu === 'Settings'}
            onClick={() => setActiveMenu('Settings')}
          />
          <SidebarItem
            icon={Icons.Support}
            label="Support"
            active={activeMenu === 'Support'}
            onClick={() => setActiveMenu('Support')}
          />
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-teal-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-medium">
              S
            </div>
            <div className="flex-1">
              <p className="text-white font-medium text-sm">Sarah Jenkins</p>
              <p className="text-teal-300 text-xs">Super Admin</p>
            </div>
            <button className="text-teal-300 hover:text-white">
              <Icons.Logout />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Icons.Search />
                <input
                  type="text"
                  placeholder="Search modules, teachers, or documents..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-800">EN</button>
                <button className="px-3 py-1 text-sm font-medium text-gray-400 hover:text-gray-600">AR</button>
              </div>
              <button className="relative p-2 text-gray-600 hover:text-gray-800">
                <Icons.Bell />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 p-6 overflow-auto">
          {/* Title Section */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Administrator Dashboard</h2>
              <p className="text-gray-500 mt-1">Operational overview for Wifaq School modules.</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg">
              <Icons.Calendar />
              <span className="text-sm text-gray-600">Oct 24, 2023 - Today</span>
            </div>
          </div>

          {/* API Status */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">API Status:</span> {apiStatus}
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-12 gap-6">
            {/* Payroll Management */}
            <div className="col-span-12 lg:col-span-5 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center text-teal-600">
                    <Icons.Money />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Payroll Management</h3>
                    <p className="text-sm text-gray-500">October Disbursement Status</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full uppercase tracking-wide">
                  Pending Processing
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Pending Salaries</p>
                  <p className="text-2xl font-bold text-gray-800">12 <span className="text-sm font-normal text-gray-500">staff members</span></p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Amount</p>
                  <p className="text-2xl font-bold text-teal-600">$45,000 <span className="text-sm font-normal text-gray-500">USD</span></p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 border-2 border-white flex items-center justify-center text-white text-xs font-medium">
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                  <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs text-gray-600 font-medium">
                    +9
                  </div>
                </div>
                <button className="px-6 py-2 bg-teal-700 text-white rounded-lg font-medium hover:bg-teal-800 transition-colors">
                  Process Batch
                </button>
              </div>
            </div>

            {/* Leave Requests */}
            <div className="col-span-12 lg:col-span-4 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                  <Icons.Calendar />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Leave Requests</h3>
                  <p className="text-sm text-gray-500">8 Requests awaiting</p>
                </div>
              </div>

              <div className="space-y-2">
                <LeaveRequestItem name="Dr. Arham..." type="Medical" days="2 Days" status="approved" />
                <LeaveRequestItem name="Sarah Ahm..." type="Personal" days="1 Day" status="approved" />
                <LeaveRequestItem name="Prof. Uzair" type="Academic" days="5 Days" status="pending" />
              </div>

              <button className="w-full mt-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors uppercase tracking-wide">
                View All Requests
              </button>
            </div>

            {/* Number Puzzle */}
            <div className="col-span-12 lg:col-span-3 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                  <Icons.Game />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Number Puzzle</h3>
                  <p className="text-sm text-gray-500">Weekly Challenge #42</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <NumberPuzzleCell number={1} />
                <NumberPuzzleCell number={2} />
                <NumberPuzzleCell number={3} />
                <NumberPuzzleCell number={4} />
                <NumberPuzzleCell number={5} />
                <NumberPuzzleCell empty />
                <NumberPuzzleCell number={7} />
                <NumberPuzzleCell number={8} />
                <NumberPuzzleCell number={6} />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Top Scorer</p>
                  <p className="font-medium text-gray-800">Grade 8-B</p>
                </div>
                <button className="text-amber-600 text-sm font-medium hover:text-amber-700">
                  Update Puzzle
                </button>
              </div>
            </div>

            {/* Departments */}
            <div className="col-span-12 lg:col-span-4 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                  <Icons.Users />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Departments</h3>
                  <p className="text-sm text-gray-500">6 Active Units</p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { name: 'Mathematics', status: 'Optimal' },
                  { name: 'Sciences', status: 'Optimal' },
                  { name: 'Humanities', status: 'Understaffed' },
                  { name: 'Language Dept', status: 'Optimal' },
                ].map((dept) => (
                  <div key={dept.name} className="flex items-center justify-between">
                    <span className="text-gray-700">{dept.name}</span>
                    <StatusBadge status={dept.status} />
                  </div>
                ))}
              </div>
            </div>

            {/* Server Health */}
            <div className="col-span-12 lg:col-span-4 bg-teal-700 rounded-xl p-6 text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center">
                  <Icons.Shield />
                </div>
                <div>
                  <h3 className="font-semibold">Server Health</h3>
                  <p className="text-teal-200 text-sm">99.9% Uptime</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="h-2 bg-teal-800 rounded-full overflow-hidden">
                  <div className="h-full w-4/5 bg-white rounded-full"></div>
                </div>
              </div>

              <p className="text-sm text-teal-200 mb-4">STORAGE: 420GB / 500GB</p>

              <button className="w-full py-2 bg-white text-teal-700 rounded-lg font-medium hover:bg-teal-50 transition-colors">
                Run Diagnostics
              </button>
            </div>

            {/* Quick Actions */}
            <div className="col-span-12 lg:col-span-4 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                  <Icons.Bolt />
                </div>
                <h3 className="font-semibold text-gray-800">Quick Actions</h3>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <QuickActionButton icon={Icons.AddUser} label="Add Staff" />
                <QuickActionButton icon={Icons.Upload} label="Upload Bulk" />
                <QuickActionButton icon={Icons.Report} label="Report" />
                <QuickActionButton icon={Icons.Notice} label="Notice" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
