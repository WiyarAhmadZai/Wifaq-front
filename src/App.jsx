import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

// HR Pages - List
import Staff from './pages/hr/Staff';
import Contracts from './pages/hr/Contracts';
import Attendance from './pages/hr/Attendance';
import LeaveRequest from './pages/hr/LeaveRequest';
import JobApplication from './pages/hr/JobApplication';
import AddVendor from './pages/hr/AddVendor';
import PurchaseRequest from './pages/hr/PurchaseRequest';
import StaffTask from './pages/hr/StaffTask';
import Planner from './pages/hr/Planner';
import VisitorLog from './pages/hr/VisitorLog';
import HRReports from './pages/hr/HRReports';

// HR Pages - Form (Create/Edit)
import StaffForm from './pages/hr/StaffForm';
import ContractsForm from './pages/hr/ContractsForm';
import AttendanceForm from './pages/hr/AttendanceForm';
import LeaveRequestForm from './pages/hr/LeaveRequestForm';
import JobApplicationForm from './pages/hr/JobApplicationForm';
import AddVendorForm from './pages/hr/AddVendorForm';
import PurchaseRequestForm from './pages/hr/PurchaseRequestForm';
import StaffTaskForm from './pages/hr/StaffTaskForm';
import PlannerForm from './pages/hr/PlannerForm';
import VisitorLogForm from './pages/hr/VisitorLogForm';

// HR Pages - Show
import StaffShow from './pages/hr/StaffShow';
import ContractsShow from './pages/hr/ContractsShow';
import AttendanceShow from './pages/hr/AttendanceShow';
import LeaveRequestShow from './pages/hr/LeaveRequestShow';
import JobApplicationShow from './pages/hr/JobApplicationShow';
import AddVendorShow from './pages/hr/AddVendorShow';
import PurchaseRequestShow from './pages/hr/PurchaseRequestShow';
import StaffTaskShow from './pages/hr/StaffTaskShow';
import PlannerShow from './pages/hr/PlannerShow';
import VisitorLogShow from './pages/hr/VisitorLogShow';

const Placeholder = ({ title }) => (
  <div className="p-4 sm:p-6">
    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">{title}</h2>
    <p className="text-gray-600">This page is under development.</p>
  </div>
);

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const token = localStorage.getItem('token');
  return !token ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />

        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="departments" element={<Placeholder title="Departments" />} />
          <Route path="payroll" element={<Placeholder title="Payroll" />} />
          <Route path="leave-requests" element={<Placeholder title="Leave Requests" />} />
          <Route path="number-puzzle" element={<Placeholder title="Number Puzzle" />} />
          <Route path="settings" element={<Placeholder title="Settings" />} />
          <Route path="support" element={<Placeholder title="Support" />} />

          {/* HR Routes - Staff */}
          <Route path="hr/staff" element={<Staff />} />
          <Route path="hr/staff/create" element={<StaffForm />} />
          <Route path="hr/staff/edit/:id" element={<StaffForm />} />
          <Route path="hr/staff/show/:id" element={<StaffShow />} />

          {/* HR Routes - Contracts */}
          <Route path="hr/contracts" element={<Contracts />} />
          <Route path="hr/contracts/create" element={<ContractsForm />} />
          <Route path="hr/contracts/edit/:id" element={<ContractsForm />} />
          <Route path="hr/contracts/show/:id" element={<ContractsShow />} />

          {/* HR Routes - Attendance */}
          <Route path="hr/attendance" element={<Attendance />} />
          <Route path="hr/attendance/create" element={<AttendanceForm />} />
          <Route path="hr/attendance/edit/:id" element={<AttendanceForm />} />
          <Route path="hr/attendance/show/:id" element={<AttendanceShow />} />

          {/* HR Routes - Leave Request */}
          <Route path="hr/leave-request" element={<LeaveRequest />} />
          <Route path="hr/leave-request/create" element={<LeaveRequestForm />} />
          <Route path="hr/leave-request/edit/:id" element={<LeaveRequestForm />} />
          <Route path="hr/leave-request/show/:id" element={<LeaveRequestShow />} />

          {/* HR Routes - Job Application */}
          <Route path="hr/job-application" element={<JobApplication />} />
          <Route path="hr/job-application/create" element={<JobApplicationForm />} />
          <Route path="hr/job-application/edit/:id" element={<JobApplicationForm />} />
          <Route path="hr/job-application/show/:id" element={<JobApplicationShow />} />

          {/* HR Routes - Add Vendor */}
          <Route path="hr/add-vendor" element={<AddVendor />} />
          <Route path="hr/add-vendor/create" element={<AddVendorForm />} />
          <Route path="hr/add-vendor/edit/:id" element={<AddVendorForm />} />
          <Route path="hr/add-vendor/show/:id" element={<AddVendorShow />} />

          {/* HR Routes - Purchase Request */}
          <Route path="hr/purchase-request" element={<PurchaseRequest />} />
          <Route path="hr/purchase-request/create" element={<PurchaseRequestForm />} />
          <Route path="hr/purchase-request/edit/:id" element={<PurchaseRequestForm />} />
          <Route path="hr/purchase-request/show/:id" element={<PurchaseRequestShow />} />

          {/* HR Routes - Staff Task */}
          <Route path="hr/staff-task" element={<StaffTask />} />
          <Route path="hr/staff-task/create" element={<StaffTaskForm />} />
          <Route path="hr/staff-task/edit/:id" element={<StaffTaskForm />} />
          <Route path="hr/staff-task/show/:id" element={<StaffTaskShow />} />

          {/* HR Routes - Planner */}
          <Route path="hr/planner" element={<Planner />} />
          <Route path="hr/planner/create" element={<PlannerForm />} />
          <Route path="hr/planner/edit/:id" element={<PlannerForm />} />
          <Route path="hr/planner/show/:id" element={<PlannerShow />} />

          {/* HR Routes - Visitor Log */}
          <Route path="hr/visitor-log" element={<VisitorLog />} />
          <Route path="hr/visitor-log/create" element={<VisitorLogForm />} />
          <Route path="hr/visitor-log/edit/:id" element={<VisitorLogForm />} />
          <Route path="hr/visitor-log/show/:id" element={<VisitorLogShow />} />

          {/* HR Routes - Reports */}
          <Route path="hr/reports" element={<HRReports />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App
