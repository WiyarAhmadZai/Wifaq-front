import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';

// HR Pages
import Attendance from './pages/hr/Attendance';
import LeaveRequest from './pages/hr/LeaveRequest';
import JobApplication from './pages/hr/JobApplication';
import AddVendor from './pages/hr/AddVendor';
import PurchaseRequest from './pages/hr/PurchaseRequest';
import StaffTask from './pages/hr/StaffTask';
import Planner from './pages/hr/Planner';
import VisitorLog from './pages/hr/VisitorLog';

// Placeholder components for other routes
const Placeholder = ({ title }) => (
  <div>
    <h2 className="text-2xl font-bold text-gray-800 mb-4">{title}</h2>
    <p className="text-gray-600">This page is under development.</p>
  </div>
);

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          {/* Main Routes */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/departments" element={<Placeholder title="Departments" />} />
          <Route path="/payroll" element={<Placeholder title="Payroll" />} />
          <Route path="/leave-requests" element={<Placeholder title="Leave Requests" />} />
          <Route path="/number-puzzle" element={<Placeholder title="Number Puzzle" />} />
          <Route path="/settings" element={<Placeholder title="Settings" />} />
          <Route path="/support" element={<Placeholder title="Support" />} />

          {/* HR Routes */}
          <Route path="/hr/attendance" element={<Attendance />} />
          <Route path="/hr/leave-request" element={<LeaveRequest />} />
          <Route path="/hr/job-application" element={<JobApplication />} />
          <Route path="/hr/add-vendor" element={<AddVendor />} />
          <Route path="/hr/purchase-request" element={<PurchaseRequest />} />
          <Route path="/hr/staff-task" element={<StaffTask />} />
          <Route path="/hr/planner" element={<Planner />} />
          <Route path="/hr/visitor-log" element={<VisitorLog />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App
