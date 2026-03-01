import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";

// HR Pages - List
import Staff from "./pages/hr/Staff";
import Contracts from "./pages/hr/Contracts";
import Attendance from "./pages/hr/Attendance";
import QuickAttendance from "./pages/hr/QuickAttendance";
import AttendanceReport from "./pages/hr/AttendanceReport";
import LeaveRequest from "./pages/hr/LeaveRequest";
import Jobs from "./pages/hr/Jobs";
import JobApplication from "./pages/hr/JobApplication";
import AddVendor from "./pages/hr/AddVendor";
import PurchaseRequest from "./pages/hr/PurchaseRequest";
import StaffTask from "./pages/hr/StaffTask";
import Planner from "./pages/hr/Planner";
import VisitorLog from "./pages/hr/VisitorLog";
import HRReports from "./pages/hr/HRReports";

// HR Pages - Form (Create/Edit)
import StaffForm from "./pages/hr/StaffForm";
import ContractsForm from "./pages/hr/ContractsForm";
import AttendanceForm from "./pages/hr/AttendanceForm";
import LeaveRequestForm from "./pages/hr/LeaveRequestForm";
import JobsForm from "./pages/hr/JobsForm";
import JobApplicationForm from "./pages/hr/JobApplicationForm";
import AddVendorForm from "./pages/hr/AddVendorForm";
import PurchaseRequestForm from "./pages/hr/PurchaseRequestForm";
import StaffTaskForm from "./pages/hr/StaffTaskForm";
import PlannerForm from "./pages/hr/PlannerForm";
import VisitorLogForm from "./pages/hr/VisitorLogForm";

// HR Pages - Show
import StaffShow from "./pages/hr/StaffShow";
import ContractsShow from "./pages/hr/ContractsShow";
import AttendanceShow from "./pages/hr/AttendanceShow";
import LeaveRequestShow from "./pages/hr/LeaveRequestShow";
import JobsShow from "./pages/hr/JobsShow";
import JobApplicationShow from "./pages/hr/JobApplicationShow";
import AddVendorShow from "./pages/hr/AddVendorShow";
import PurchaseRequestShow from "./pages/hr/PurchaseRequestShow";
import StaffTaskShow from "./pages/hr/StaffTaskShow";
import PlannerShow from "./pages/hr/PlannerShow";
import VisitorLogShow from "./pages/hr/VisitorLogShow";

// Student Registration Pages
import EntryPhase1 from "./pages/student-registration/EntryPhase1";
import EntryPhase2 from "./pages/student-registration/EntryPhase2";
import Finance from "./pages/student-registration/Finance";
import TawafooqNama from "./pages/student-registration/headship/TawafooqNama";
import SeeParcha from "./pages/student-registration/headship/SeeParcha";

const Placeholder = ({ title }) => (
  <div className="p-4 sm:p-6">
    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">
      {title}
    </h2>
    <p className="text-gray-600">This page is under development.</p>
  </div>
);

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const token = localStorage.getItem("token");
  return !token ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route
            path="departments"
            element={<Placeholder title="Departments" />}
          />
          <Route path="payroll" element={<Placeholder title="Payroll" />} />
          <Route
            path="leave-requests"
            element={<Placeholder title="Leave Requests" />}
          />
          <Route
            path="number-puzzle"
            element={<Placeholder title="Number Puzzle" />}
          />
          <Route path="settings" element={<Placeholder title="Settings" />} />
          <Route path="support" element={<Placeholder title="Support" />} />

          {/* Student Registration Routes */}
          <Route path="student-registration/entry-phase-1" element={<EntryPhase1 />} />
          <Route path="student-registration/entry-phase-1/create" element={<Placeholder title="Create Entry Phase 1" />} />
          <Route path="student-registration/entry-phase-1/edit/:id" element={<Placeholder title="Edit Entry Phase 1" />} />
          <Route path="student-registration/entry-phase-1/show/:id" element={<Placeholder title="View Entry Phase 1" />} />

          <Route path="student-registration/entry-phase-2" element={<EntryPhase2 />} />
          <Route path="student-registration/entry-phase-2/create" element={<Placeholder title="Create Entry Phase 2" />} />
          <Route path="student-registration/entry-phase-2/edit/:id" element={<Placeholder title="Edit Entry Phase 2" />} />
          <Route path="student-registration/entry-phase-2/show/:id" element={<Placeholder title="View Entry Phase 2" />} />

          <Route path="student-registration/finance" element={<Finance />} />
          <Route path="student-registration/finance/create" element={<Placeholder title="Create Finance" />} />
          <Route path="student-registration/finance/edit/:id" element={<Placeholder title="Edit Finance" />} />
          <Route path="student-registration/finance/show/:id" element={<Placeholder title="View Finance" />} />

          <Route path="student-registration/headship/tawafooq-nama" element={<TawafooqNama />} />
          <Route path="student-registration/headship/tawafooq-nama/create" element={<Placeholder title="Create Tawafooq Nama" />} />
          <Route path="student-registration/headship/tawafooq-nama/edit/:id" element={<Placeholder title="Edit Tawafooq Nama" />} />
          <Route path="student-registration/headship/tawafooq-nama/show/:id" element={<Placeholder title="View Tawafooq Nama" />} />

          <Route path="student-registration/headship/see-parcha" element={<SeeParcha />} />
          <Route path="student-registration/headship/see-parcha/create" element={<Placeholder title="Create See Parcha" />} />
          <Route path="student-registration/headship/see-parcha/edit/:id" element={<Placeholder title="Edit See Parcha" />} />
          <Route path="student-registration/headship/see-parcha/show/:id" element={<Placeholder title="View See Parcha" />} />

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
          <Route path="hr/attendance/quick" element={<QuickAttendance />} />
          <Route path="hr/attendance/report" element={<AttendanceReport />} />
          <Route path="hr/attendance/create" element={<AttendanceForm />} />
          <Route path="hr/attendance/edit/:id" element={<AttendanceForm />} />
          <Route path="hr/attendance/show/:id" element={<AttendanceShow />} />

          {/* HR Routes - Leave Request */}
          <Route path="hr/leave-request" element={<LeaveRequest />} />
          <Route
            path="hr/leave-request/create"
            element={<LeaveRequestForm />}
          />
          <Route
            path="hr/leave-request/edit/:id"
            element={<LeaveRequestForm />}
          />
          <Route
            path="hr/leave-request/show/:id"
            element={<LeaveRequestShow />}
          />

          {/* HR Routes - Jobs */}
          <Route path="hr/jobs" element={<Jobs />} />
          <Route path="hr/jobs/create" element={<JobsForm />} />
          <Route path="hr/jobs/edit/:id" element={<JobsForm />} />
          <Route path="hr/jobs/show/:id" element={<JobsShow />} />

          {/* HR Routes - Job Application */}
          <Route path="hr/job-application" element={<JobApplication />} />
          <Route
            path="hr/job-application/create"
            element={<JobApplicationForm />}
          />
          <Route
            path="hr/job-application/edit/:id"
            element={<JobApplicationForm />}
          />
          <Route
            path="hr/job-application/show/:id"
            element={<JobApplicationShow />}
          />

          {/* HR Routes - Add Vendor */}
          <Route path="hr/add-vendor" element={<AddVendor />} />
          <Route path="hr/add-vendor/create" element={<AddVendorForm />} />
          <Route path="hr/add-vendor/edit/:id" element={<AddVendorForm />} />
          <Route path="hr/add-vendor/show/:id" element={<AddVendorShow />} />

          {/* HR Routes - Purchase Request */}
          <Route path="hr/purchase-request" element={<PurchaseRequest />} />
          <Route
            path="hr/purchase-request/create"
            element={<PurchaseRequestForm />}
          />
          <Route
            path="hr/purchase-request/edit/:id"
            element={<PurchaseRequestForm />}
          />
          <Route
            path="hr/purchase-request/show/:id"
            element={<PurchaseRequestShow />}
          />

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

export default App;
