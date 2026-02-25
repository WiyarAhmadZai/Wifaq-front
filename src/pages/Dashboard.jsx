import { useState, useEffect } from 'react';
import { get } from '../api/axios';

const Icons = {
  Money: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Game: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Users: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  Shield: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Bolt: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  AddUser: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  ),
  Upload: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
  Report: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Notice: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  ),
};

const StatusBadge = ({ status }) => {
  const styles = {
    Optimal: 'bg-emerald-100 text-emerald-700',
    Understaffed: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${styles[status] || styles.Optimal}`}>
      {status}
    </span>
  );
};

const LeaveRequestItem = ({ name, type, days, status }) => (
  <div className="flex items-center justify-between py-1.5">
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xs font-medium">
        {name.charAt(0)}
      </div>
      <div>
        <p className="font-medium text-gray-800 text-xs">{name}</p>
        <p className="text-[10px] text-gray-500">{type} • {days}</p>
      </div>
    </div>
    {status === 'approved' && (
      <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    )}
  </div>
);

const NumberPuzzleCell = ({ number, empty }) => (
  <div className={`w-8 h-8 flex items-center justify-center rounded text-xs font-semibold ${
    empty ? 'bg-gray-100' : 'bg-white border border-gray-200 shadow-sm'
  }`}>
    {number}
  </div>
);

const QuickActionButton = ({ icon: Icon, label }) => (
  <button className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-200 hover:border-teal-500 hover:bg-teal-50 transition-colors">
    <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-600">
      <Icon />
    </div>
    <span className="text-[10px] font-medium text-gray-600 uppercase">{label}</span>
  </button>
);

export default function Dashboard() {
  const [apiStatus, setApiStatus] = useState('Checking...');

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
    <div className="p-4">
      {/* Title Section */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Administrator Dashboard</h2>
          <p className="text-gray-500 text-xs mt-0.5">Operational overview for Wifaq School modules.</p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded-lg">
          <Icons.Calendar />
          <span className="text-xs text-gray-600">Oct 24, 2023 - Today</span>
        </div>
      </div>

      {/* API Status */}
      <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <span className="font-semibold">API Status:</span> {apiStatus}
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Payroll Management */}
        <div className="col-span-12 lg:col-span-5 bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center text-teal-600">
                <Icons.Money />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 text-sm">Payroll Management</h3>
                <p className="text-xs text-gray-500">October Disbursement Status</p>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium rounded-full uppercase tracking-wide">
              Pending
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Pending Salaries</p>
              <p className="text-lg font-bold text-gray-800">12 <span className="text-xs font-normal text-gray-500">staff</span></p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Total Amount</p>
              <p className="text-lg font-bold text-teal-600">$45k <span className="text-xs font-normal text-gray-500">USD</span></p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex -space-x-1.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 border-2 border-white flex items-center justify-center text-white text-[10px] font-medium">
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
              <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] text-gray-600 font-medium">
                +9
              </div>
            </div>
            <button className="px-4 py-1.5 bg-teal-700 text-white rounded-lg text-xs font-medium hover:bg-teal-800 transition-colors">
              Process
            </button>
          </div>
        </div>

        {/* Leave Requests */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
              <Icons.Calendar />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">Leave Requests</h3>
              <p className="text-xs text-gray-500">8 Requests awaiting</p>
            </div>
          </div>

          <div className="space-y-1">
            <LeaveRequestItem name="Dr. Arham..." type="Medical" days="2 Days" status="approved" />
            <LeaveRequestItem name="Sarah Ahm..." type="Personal" days="1 Day" status="approved" />
            <LeaveRequestItem name="Prof. Uzair" type="Academic" days="5 Days" status="pending" />
          </div>

          <button className="w-full mt-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors uppercase tracking-wide">
            View All
          </button>
        </div>

        {/* Number Puzzle */}
        <div className="col-span-12 lg:col-span-3 bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
              <Icons.Game />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">Number Puzzle</h3>
              <p className="text-xs text-gray-500">Weekly Challenge #42</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 mb-3">
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

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Top Scorer</p>
              <p className="font-medium text-gray-800 text-xs">Grade 8-B</p>
            </div>
            <button className="text-amber-600 text-xs font-medium hover:text-amber-700">
              Update
            </button>
          </div>
        </div>

        {/* Departments */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
              <Icons.Users />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">Departments</h3>
              <p className="text-xs text-gray-500">6 Active Units</p>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { name: 'Mathematics', status: 'Optimal' },
              { name: 'Sciences', status: 'Optimal' },
              { name: 'Humanities', status: 'Understaffed' },
              { name: 'Language Dept', status: 'Optimal' },
            ].map((dept) => (
              <div key={dept.name} className="flex items-center justify-between">
                <span className="text-gray-700 text-xs">{dept.name}</span>
                <StatusBadge status={dept.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Server Health */}
        <div className="col-span-12 lg:col-span-4 bg-teal-700 rounded-lg p-4 text-white">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <Icons.Shield />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Server Health</h3>
              <p className="text-teal-200 text-xs">99.9% Uptime</p>
            </div>
          </div>

          <div className="mb-3">
            <div className="h-1.5 bg-teal-800 rounded-full overflow-hidden">
              <div className="h-full w-4/5 bg-white rounded-full"></div>
            </div>
          </div>

          <p className="text-xs text-teal-200 mb-3">STORAGE: 420GB / 500GB</p>

          <button className="w-full py-1.5 bg-white text-teal-700 rounded-lg text-xs font-medium hover:bg-teal-50 transition-colors">
            Run Diagnostics
          </button>
        </div>

        {/* Quick Actions */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
              <Icons.Bolt />
            </div>
            <h3 className="font-semibold text-gray-800 text-sm">Quick Actions</h3>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <QuickActionButton icon={Icons.AddUser} label="Add Staff" />
            <QuickActionButton icon={Icons.Upload} label="Upload" />
            <QuickActionButton icon={Icons.Report} label="Report" />
            <QuickActionButton icon={Icons.Notice} label="Notice" />
          </div>
        </div>
      </div>
    </div>
  );
}
