import { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Layout from "./components/Layout";

// Loading spinner shown while lazy components load
const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-100 border-t-teal-600"></div>
      <span className="text-gray-400 text-xs">Loading...</span>
    </div>
  </div>
);

const L = (fn) => {
  const Component = lazy(fn);
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
};

// Core
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Login = lazy(() => import("./pages/Login"));
const MyProfile = lazy(() => import("./pages/MyProfile"));

// HR Pages - List
const Staff = lazy(() => import("./pages/hr/Staff"));
const Contracts = lazy(() => import("./pages/hr/Contracts"));
const VendorContracts = lazy(() => import("./pages/hr/VendorContracts"));
const Attendance = lazy(() => import("./pages/hr/Attendance"));
const QuickAttendance = lazy(() => import("./pages/hr/QuickAttendance"));
const AttendanceReport = lazy(() => import("./pages/hr/AttendanceReport"));
const LeaveRequest = lazy(() => import("./pages/hr/LeaveRequest"));
const Jobs = lazy(() => import("./pages/hr/Jobs"));
const JobApplication = lazy(() => import("./pages/hr/JobApplication"));
const AddVendor = lazy(() => import("./pages/hr/AddVendor"));
const StaffTask = lazy(() => import("./pages/hr/StaffTask"));
const Planner = lazy(() => import("./pages/hr/Planner"));
const VisitorLog = lazy(() => import("./pages/hr/VisitorLog"));
const HRReports = lazy(() => import("./pages/hr/HRReports"));
const Meetings = lazy(() => import("./pages/hr/Meetings"));
const MeetingForm = lazy(() => import("./pages/hr/MeetingForm"));
const MeetingShow = lazy(() => import("./pages/hr/MeetingShow"));
const Events = lazy(() => import("./pages/hr/Events"));
const EventForm = lazy(() => import("./pages/hr/EventForm"));
const EventShow = lazy(() => import("./pages/hr/EventShow"));
const SalarySnapshot = lazy(() => import("./pages/hr/SalarySnapshot"));

// HR Pages - Form
const StaffForm = lazy(() => import("./pages/hr/StaffForm"));
const StaffLogs = lazy(() => import("./pages/hr/StaffLogs"));
const ContractsForm = lazy(() => import("./pages/hr/ContractsForm"));
const VendorContractsForm = lazy(() => import("./pages/hr/VendorContractsForm"));
const AttendanceForm = lazy(() => import("./pages/hr/AttendanceForm"));
const LeaveRequestForm = lazy(() => import("./pages/hr/LeaveRequestForm"));
const JobsForm = lazy(() => import("./pages/hr/JobsForm"));
const JobApplicationForm = lazy(() => import("./pages/hr/JobApplicationForm"));
const AddVendorForm = lazy(() => import("./pages/hr/AddVendorForm"));
const StaffTaskForm = lazy(() => import("./pages/hr/StaffTaskForm"));
const PlannerForm = lazy(() => import("./pages/hr/PlannerForm"));
const VisitorLogForm = lazy(() => import("./pages/hr/VisitorLogForm"));
const SalarySnapshotForm = lazy(() => import("./pages/hr/SalarySnapshotForm"));

// HR Pages - Show
const StaffShow = lazy(() => import("./pages/hr/StaffShow"));
const ContractsShow = lazy(() => import("./pages/hr/ContractsShow"));
const VendorContractsShow = lazy(() => import("./pages/hr/VendorContractsShow"));
const AttendanceShow = lazy(() => import("./pages/hr/AttendanceShow"));
const LeaveRequestShow = lazy(() => import("./pages/hr/LeaveRequestShow"));
const JobsShow = lazy(() => import("./pages/hr/JobsShow"));
const JobApplicationShow = lazy(() => import("./pages/hr/JobApplicationShow"));
const AddVendorShow = lazy(() => import("./pages/hr/AddVendorShow"));
const StaffTaskShow = lazy(() => import("./pages/hr/StaffTaskShow"));
const PlannerShow = lazy(() => import("./pages/hr/PlannerShow"));
const VisitorLogShow = lazy(() => import("./pages/hr/VisitorLogShow"));
const SalarySnapshotShow = lazy(() => import("./pages/hr/SalarySnapshotShow"));

// Student Management
const Parents = lazy(() => import("./pages/studentMangement/Parents"));
const ParentForm = lazy(() => import("./pages/studentMangement/ParentForm"));
const ParentShow = lazy(() => import("./pages/studentMangement/ParentShow"));
const AcademicTerms = lazy(() => import("./pages/studentMangement/AcademicTerms"));
const Grades = lazy(() => import("./pages/studentMangement/Grades"));
const GradeForm = lazy(() => import("./pages/studentMangement/GradeForm"));
const GradeShow = lazy(() => import("./pages/studentMangement/GradeShow"));
const AcademicTermForm = lazy(() => import("./pages/studentMangement/AcademicTermForm"));
const AcademicTermShow = lazy(() => import("./pages/studentMangement/AcademicTermShow"));
const TransportRoutes = lazy(() => import("./pages/studentMangement/Routes"));
const RouteForm = lazy(() => import("./pages/studentMangement/RouteForm"));
const Vehicles = lazy(() => import("./pages/studentMangement/Vehicles"));
const VehicleForm = lazy(() => import("./pages/studentMangement/VehicleForm"));
const Students = lazy(() => import("./pages/studentMangement/Students"));
const StudentForm = lazy(() => import("./pages/studentMangement/StudentForm"));
const StudentEnrollments = lazy(() => import("./pages/studentMangement/StudentEnrollments"));
const StudentEnrollmentForm = lazy(() => import("./pages/studentMangement/StudentEnrollmentForm"));

// Teacher Management
const AnnualPlans = lazy(() => import("./pages/teacher-management/AnnualPlans"));
const LessonPlans = lazy(() => import("./pages/teacher-management/LessonPlans"));
const Teachers = lazy(() => import("./pages/teacher-management/teacher/Teachers"));
const TeachersForm = lazy(() => import("./pages/teacher-management/teacher/TeachersForm"));
const TeachersShow = lazy(() => import("./pages/teacher-management/teacher/TeachersShow"));
const TeacherSubjects = lazy(() => import("./pages/teacher-management/teacher-subjects/TeacherSubjects"));
const TeacherSubjectForm = lazy(() => import("./pages/teacher-management/teacher-subjects/TeacherSubjectForm"));
const TeacherSubjectShow = lazy(() => import("./pages/teacher-management/teacher-subjects/TeacherSubjectShow"));

// Branches
const Branches = lazy(() => import("./pages/branches/Branches"));
const BranchForm = lazy(() => import("./pages/branches/BranchForm"));
const BranchShow = lazy(() => import("./pages/branches/BranchShow"));

// Class Management
const Classes = lazy(() => import("./pages/class-management/Classes"));
const ClassesForm = lazy(() => import("./pages/class-management/ClassesForm"));
const ClassesShow = lazy(() => import("./pages/class-management/ClassesShow"));
const Subjects = lazy(() => import("./pages/class-management/Subjects"));
const SubjectsForm = lazy(() => import("./pages/class-management/SubjectsForm"));
const SubjectsShow = lazy(() => import("./pages/class-management/SubjectsShow"));
const Exams = lazy(() => import("./pages/class-management/Exams"));
const ExamsForm = lazy(() => import("./pages/class-management/ExamsForm"));
const ExamsShow = lazy(() => import("./pages/class-management/ExamsShow"));
const Schedule = lazy(() => import("./pages/class-management/Schedule"));
const ScheduleForm = lazy(() => import("./pages/class-management/ScheduleForm"));
const ScheduleShow = lazy(() => import("./pages/class-management/ScheduleShow"));

// Recruitment
const JobRequisitions = lazy(() => import("./pages/recruitment/JobRequisitions"));
const JobRequisitionForm = lazy(() => import("./pages/recruitment/JobRequisitionForm"));
const JobRequisitionShow = lazy(() => import("./pages/recruitment/JobRequisitionShow"));
const JobPostings = lazy(() => import("./pages/recruitment/JobPostings"));
const JobPostingForm = lazy(() => import("./pages/recruitment/JobPostingForm"));
const JobPostingShow = lazy(() => import("./pages/recruitment/JobPostingShow"));
const Applications = lazy(() => import("./pages/recruitment/Applications"));
const ApplicationForm = lazy(() => import("./pages/recruitment/ApplicationForm"));
const ApplicationShow = lazy(() => import("./pages/recruitment/ApplicationShow"));
const CandidatePool = lazy(() => import("./pages/recruitment/CandidatePool"));
const CandidatePoolForm = lazy(() => import("./pages/recruitment/CandidatePoolForm"));
const CandidatePoolShow = lazy(() => import("./pages/recruitment/CandidatePoolShow"));

// Finance
const FeePayments = lazy(() => import("./pages/finance/FeePayments"));
const FeePaymentForm = lazy(() => import("./pages/finance/FeePaymentForm"));
const FinanceDashboard = lazy(() => import("./pages/finance/FinanceDashboard"));
const FinanceAccounts = lazy(() => import("./pages/finance/Accounts"));
const AccountForm = lazy(() => import("./pages/finance/AccountForm"));
const ChartOfAccounts = lazy(() => import("./pages/finance/ChartOfAccounts"));
const ChartOfAccountForm = lazy(() => import("./pages/finance/ChartOfAccountForm"));
const Invoices = lazy(() => import("./pages/finance/Invoices"));
const InvoiceForm = lazy(() => import("./pages/finance/InvoiceForm"));
const Payments = lazy(() => import("./pages/finance/Payments"));
const PaymentForm = lazy(() => import("./pages/finance/PaymentForm"));
const Budgets = lazy(() => import("./pages/finance/Budgets"));
const BudgetForm = lazy(() => import("./pages/finance/BudgetForm"));
const FeeInvoices = lazy(() => import("./pages/finance/FeeInvoices"));
const FeeInvoiceForm = lazy(() => import("./pages/finance/FeeInvoiceForm"));
const FeeInvoiceShow = lazy(() => import("./pages/finance/FeeInvoiceShow"));

// Purchase
const PurchaseRequests = lazy(() => import("./pages/purchase/PurchaseRequests"));
const PurchaseRequestFormNew = lazy(() => import("./pages/purchase/PurchaseRequestForm"));
const PurchaseRequestShowNew = lazy(() => import("./pages/purchase/PurchaseRequestShow"));
const Suppliers = lazy(() => import("./pages/purchase/Suppliers"));
const SupplierForm = lazy(() => import("./pages/purchase/SupplierForm"));
const SupplierShow = lazy(() => import("./pages/purchase/SupplierShow"));
const Stock = lazy(() => import("./pages/purchase/Stock"));
const StockForm = lazy(() => import("./pages/purchase/StockForm"));
const StockShow = lazy(() => import("./pages/purchase/StockShow"));
const RoutineItems = lazy(() => import("./pages/purchase/RoutineItems"));
const RoutineItemForm = lazy(() => import("./pages/purchase/RoutineItemForm"));
const RoutineItemShow = lazy(() => import("./pages/purchase/RoutineItemShow"));
const RepairRequests = lazy(() => import("./pages/purchase/RepairRequests"));
const RepairRequestForm = lazy(() => import("./pages/purchase/RepairRequestForm"));
const RepairRequestShow = lazy(() => import("./pages/purchase/RepairRequestShow"));
const Projects = lazy(() => import("./pages/purchase/Projects"));
const ProjectForm = lazy(() => import("./pages/purchase/ProjectForm"));
const ProjectShow = lazy(() => import("./pages/purchase/ProjectShow"));

const Placeholder = ({ title }) => (
  <div className="p-4 sm:p-6">
    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">{title}</h2>
    <p className="text-gray-600">This page is under development.</p>
  </div>
);

function ProtectedRoute({ children }) {
  // const token = localStorage.getItem("token");
  // return token ? children : <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  // const token = localStorage.getItem("token");
  // return !token ? children : <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<PublicRoute>{L(() => import("./pages/Login"))}</PublicRoute>} />

          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
            <Route path="departments" element={<Placeholder title="Departments" />} />
            <Route path="payroll" element={<Placeholder title="Payroll" />} />
            <Route path="leave-requests" element={<Placeholder title="Leave Requests" />} />
            <Route path="number-puzzle" element={<Placeholder title="Number Puzzle" />} />
            <Route path="settings" element={<Placeholder title="Settings" />} />
            <Route path="support" element={<Placeholder title="Support" />} />
            <Route path="profile" element={<Suspense fallback={<PageLoader />}><MyProfile /></Suspense>} />

            {/* Teacher Management */}
            <Route path="teacher-management/annual-plans" element={<Suspense fallback={<PageLoader />}><AnnualPlans /></Suspense>} />
            <Route path="teacher-management/annual-plans/create" element={<Placeholder title="Create Annual Plan" />} />
            <Route path="teacher-management/annual-plans/edit/:id" element={<Placeholder title="Edit Annual Plan" />} />
            <Route path="teacher-management/annual-plans/show/:id" element={<Placeholder title="View Annual Plan" />} />
            <Route path="teacher-management/lesson-plans" element={<Suspense fallback={<PageLoader />}><LessonPlans /></Suspense>} />
            <Route path="teacher-management/lesson-plans/create" element={<Placeholder title="Create Lesson Plan" />} />
            <Route path="teacher-management/lesson-plans/edit/:id" element={<Placeholder title="Edit Lesson Plan" />} />
            <Route path="teacher-management/lesson-plans/show/:id" element={<Placeholder title="View Lesson Plan" />} />
            <Route path="teacher-management/teachers" element={<Suspense fallback={<PageLoader />}><Teachers /></Suspense>} />
            <Route path="teacher-management/teachers/create" element={<Suspense fallback={<PageLoader />}><TeachersForm /></Suspense>} />
            <Route path="teacher-management/teachers/edit/:id" element={<Suspense fallback={<PageLoader />}><TeachersForm /></Suspense>} />
            <Route path="teacher-management/teachers/show/:id" element={<Suspense fallback={<PageLoader />}><TeachersShow /></Suspense>} />
            <Route path="teacher-management/teacher-subjects" element={<Suspense fallback={<PageLoader />}><TeacherSubjects /></Suspense>} />
            <Route path="teacher-management/teacher-subjects/create" element={<Suspense fallback={<PageLoader />}><TeacherSubjectForm /></Suspense>} />
            <Route path="teacher-management/teacher-subjects/edit/:id" element={<Suspense fallback={<PageLoader />}><TeacherSubjectForm /></Suspense>} />
            <Route path="teacher-management/teacher-subjects/show/:id" element={<Suspense fallback={<PageLoader />}><TeacherSubjectShow /></Suspense>} />

            {/* Class Management */}
            <Route path="class-management/teachers" element={<Navigate to="/teacher-management/teachers" replace />} />
            <Route path="class-management/teachers/create" element={<Suspense fallback={<PageLoader />}><TeachersForm /></Suspense>} />
            <Route path="class-management/teachers/edit/:id" element={<Suspense fallback={<PageLoader />}><TeachersForm /></Suspense>} />
            <Route path="class-management/teachers/show/:id" element={<Suspense fallback={<PageLoader />}><TeachersShow /></Suspense>} />
            <Route path="branches" element={<Suspense fallback={<PageLoader />}><Branches /></Suspense>} />
            <Route path="branches/create" element={<Suspense fallback={<PageLoader />}><BranchForm /></Suspense>} />
            <Route path="branches/edit/:id" element={<Suspense fallback={<PageLoader />}><BranchForm /></Suspense>} />
            <Route path="branches/show/:id" element={<Suspense fallback={<PageLoader />}><BranchShow /></Suspense>} />
            <Route path="class-management/classes" element={<Suspense fallback={<PageLoader />}><Classes /></Suspense>} />
            <Route path="class-management/classes/create" element={<Suspense fallback={<PageLoader />}><ClassesForm /></Suspense>} />
            <Route path="class-management/classes/edit/:id" element={<Suspense fallback={<PageLoader />}><ClassesForm /></Suspense>} />
            <Route path="class-management/classes/show/:id" element={<Suspense fallback={<PageLoader />}><ClassesShow /></Suspense>} />
            <Route path="class-management/subjects" element={<Suspense fallback={<PageLoader />}><Subjects /></Suspense>} />
            <Route path="class-management/subjects/create" element={<Suspense fallback={<PageLoader />}><SubjectsForm /></Suspense>} />
            <Route path="class-management/subjects/edit/:id" element={<Suspense fallback={<PageLoader />}><SubjectsForm /></Suspense>} />
            <Route path="class-management/subjects/show/:id" element={<Suspense fallback={<PageLoader />}><SubjectsShow /></Suspense>} />
            <Route path="class-management/exams" element={<Suspense fallback={<PageLoader />}><Exams /></Suspense>} />
            <Route path="class-management/exams/create" element={<Suspense fallback={<PageLoader />}><ExamsForm /></Suspense>} />
            <Route path="class-management/exams/edit/:id" element={<Suspense fallback={<PageLoader />}><ExamsForm /></Suspense>} />
            <Route path="class-management/exams/show/:id" element={<Suspense fallback={<PageLoader />}><ExamsShow /></Suspense>} />
            <Route path="class-management/schedule" element={<Suspense fallback={<PageLoader />}><Schedule /></Suspense>} />
            <Route path="class-management/schedule/create" element={<Suspense fallback={<PageLoader />}><ScheduleForm /></Suspense>} />
            <Route path="class-management/schedule/edit/:id" element={<Suspense fallback={<PageLoader />}><ScheduleForm /></Suspense>} />
            <Route path="class-management/schedule/show/:id" element={<Suspense fallback={<PageLoader />}><ScheduleShow /></Suspense>} />

            {/* HR Routes */}
            <Route path="hr/salary-snapshot" element={<Suspense fallback={<PageLoader />}><SalarySnapshot /></Suspense>} />
            <Route path="hr/salary-snapshot/create" element={<Suspense fallback={<PageLoader />}><SalarySnapshotForm /></Suspense>} />
            <Route path="hr/salary-snapshot/edit/:id" element={<Suspense fallback={<PageLoader />}><SalarySnapshotForm /></Suspense>} />
            <Route path="hr/salary-snapshot/show/:id" element={<Suspense fallback={<PageLoader />}><SalarySnapshotShow /></Suspense>} />
            <Route path="hr/staff" element={<Suspense fallback={<PageLoader />}><Staff /></Suspense>} />
            <Route path="hr/staff/create" element={<Suspense fallback={<PageLoader />}><StaffForm /></Suspense>} />
            <Route path="hr/staff/edit/:id" element={<Suspense fallback={<PageLoader />}><StaffForm /></Suspense>} />
            <Route path="hr/staff/show/:id" element={<Suspense fallback={<PageLoader />}><StaffShow /></Suspense>} />
            <Route path="hr/staff-logs" element={<Suspense fallback={<PageLoader />}><StaffLogs /></Suspense>} />
            <Route path="hr/contracts" element={<Suspense fallback={<PageLoader />}><Contracts /></Suspense>} />
            <Route path="hr/contracts/create" element={<Suspense fallback={<PageLoader />}><ContractsForm /></Suspense>} />
            <Route path="hr/contracts/edit/:id" element={<Suspense fallback={<PageLoader />}><ContractsForm /></Suspense>} />
            <Route path="hr/contracts/show/:id" element={<Suspense fallback={<PageLoader />}><ContractsShow /></Suspense>} />
            <Route path="hr/vendor-contracts" element={<Suspense fallback={<PageLoader />}><VendorContracts /></Suspense>} />
            <Route path="hr/vendor-contracts/create" element={<Suspense fallback={<PageLoader />}><VendorContractsForm /></Suspense>} />
            <Route path="hr/vendor-contracts/edit/:id" element={<Suspense fallback={<PageLoader />}><VendorContractsForm /></Suspense>} />
            <Route path="hr/vendor-contracts/show/:id" element={<Suspense fallback={<PageLoader />}><VendorContractsShow /></Suspense>} />
            <Route path="hr/attendance" element={<Suspense fallback={<PageLoader />}><Attendance /></Suspense>} />
            <Route path="hr/attendance/quick" element={<Suspense fallback={<PageLoader />}><QuickAttendance /></Suspense>} />
            <Route path="hr/attendance/report" element={<Suspense fallback={<PageLoader />}><AttendanceReport /></Suspense>} />
            <Route path="hr/attendance/create" element={<Suspense fallback={<PageLoader />}><AttendanceForm /></Suspense>} />
            <Route path="hr/attendance/edit/:id" element={<Suspense fallback={<PageLoader />}><AttendanceForm /></Suspense>} />
            <Route path="hr/attendance/show/:id" element={<Suspense fallback={<PageLoader />}><AttendanceShow /></Suspense>} />
            <Route path="hr/leave-request" element={<Suspense fallback={<PageLoader />}><LeaveRequest /></Suspense>} />
            <Route path="hr/leave-request/create" element={<Suspense fallback={<PageLoader />}><LeaveRequestForm /></Suspense>} />
            <Route path="hr/leave-request/edit/:id" element={<Suspense fallback={<PageLoader />}><LeaveRequestForm /></Suspense>} />
            <Route path="hr/leave-request/show/:id" element={<Suspense fallback={<PageLoader />}><LeaveRequestShow /></Suspense>} />
            <Route path="hr/jobs" element={<Suspense fallback={<PageLoader />}><Jobs /></Suspense>} />
            <Route path="hr/jobs/create" element={<Suspense fallback={<PageLoader />}><JobsForm /></Suspense>} />
            <Route path="hr/jobs/edit/:id" element={<Suspense fallback={<PageLoader />}><JobsForm /></Suspense>} />
            <Route path="hr/jobs/show/:id" element={<Suspense fallback={<PageLoader />}><JobsShow /></Suspense>} />
            <Route path="hr/job-application" element={<Suspense fallback={<PageLoader />}><JobApplication /></Suspense>} />
            <Route path="hr/job-application/create" element={<Suspense fallback={<PageLoader />}><JobApplicationForm /></Suspense>} />
            <Route path="hr/job-application/edit/:id" element={<Suspense fallback={<PageLoader />}><JobApplicationForm /></Suspense>} />
            <Route path="hr/job-application/show/:id" element={<Suspense fallback={<PageLoader />}><JobApplicationShow /></Suspense>} />
            <Route path="hr/add-vendor" element={<Suspense fallback={<PageLoader />}><AddVendor /></Suspense>} />
            <Route path="hr/add-vendor/create" element={<Suspense fallback={<PageLoader />}><AddVendorForm /></Suspense>} />
            <Route path="hr/add-vendor/edit/:id" element={<Suspense fallback={<PageLoader />}><AddVendorForm /></Suspense>} />
            <Route path="hr/add-vendor/show/:id" element={<Suspense fallback={<PageLoader />}><AddVendorShow /></Suspense>} />
            <Route path="hr/staff-task" element={<Suspense fallback={<PageLoader />}><StaffTask /></Suspense>} />
            <Route path="hr/staff-task/create" element={<Suspense fallback={<PageLoader />}><StaffTaskForm /></Suspense>} />
            <Route path="hr/staff-task/edit/:id" element={<Suspense fallback={<PageLoader />}><StaffTaskForm /></Suspense>} />
            <Route path="hr/staff-task/show/:id" element={<Suspense fallback={<PageLoader />}><StaffTaskShow /></Suspense>} />
            <Route path="hr/planner" element={<Suspense fallback={<PageLoader />}><Planner /></Suspense>} />
            <Route path="hr/planner/create" element={<Suspense fallback={<PageLoader />}><PlannerForm /></Suspense>} />
            <Route path="hr/planner/edit/:id" element={<Suspense fallback={<PageLoader />}><PlannerForm /></Suspense>} />
            <Route path="hr/planner/show/:id" element={<Suspense fallback={<PageLoader />}><PlannerShow /></Suspense>} />
            <Route path="hr/visitor-log" element={<Suspense fallback={<PageLoader />}><VisitorLog /></Suspense>} />
            <Route path="hr/visitor-log/create" element={<Suspense fallback={<PageLoader />}><VisitorLogForm /></Suspense>} />
            <Route path="hr/visitor-log/edit/:id" element={<Suspense fallback={<PageLoader />}><VisitorLogForm /></Suspense>} />
            <Route path="hr/visitor-log/show/:id" element={<Suspense fallback={<PageLoader />}><VisitorLogShow /></Suspense>} />
            <Route path="hr/reports" element={<Suspense fallback={<PageLoader />}><HRReports /></Suspense>} />

            {/* HR Routes - Meetings */}
            <Route path="hr/meetings" element={<Suspense fallback={<PageLoader />}><Meetings /></Suspense>} />
            <Route path="hr/meetings/create" element={<Suspense fallback={<PageLoader />}><MeetingForm /></Suspense>} />
            <Route path="hr/meetings/edit/:id" element={<Suspense fallback={<PageLoader />}><MeetingForm /></Suspense>} />
            <Route path="hr/meetings/show/:id" element={<Suspense fallback={<PageLoader />}><MeetingShow /></Suspense>} />

            {/* HR Routes - Events */}
            <Route path="hr/events" element={<Suspense fallback={<PageLoader />}><Events /></Suspense>} />
            <Route path="hr/events/create" element={<Suspense fallback={<PageLoader />}><EventForm /></Suspense>} />
            <Route path="hr/events/edit/:id" element={<Suspense fallback={<PageLoader />}><EventForm /></Suspense>} />
            <Route path="hr/events/show/:id" element={<Suspense fallback={<PageLoader />}><EventShow /></Suspense>} />

            {/* Student Management */}
            <Route path="student-management/students" element={<Suspense fallback={<PageLoader />}><Students /></Suspense>} />
            <Route path="student-management/students/create" element={<Suspense fallback={<PageLoader />}><StudentForm /></Suspense>} />
            <Route path="student-management/students/edit/:id" element={<Suspense fallback={<PageLoader />}><StudentForm /></Suspense>} />
            <Route path="student-management/students/show/:id" element={<Suspense fallback={<PageLoader />}><StudentForm /></Suspense>} />
            <Route path="student-management/student-enrollments" element={<Suspense fallback={<PageLoader />}><StudentEnrollments /></Suspense>} />
            <Route path="student-management/student-enrollments/create" element={<Suspense fallback={<PageLoader />}><StudentEnrollmentForm /></Suspense>} />
            <Route path="student-management/student-enrollments/edit/:id" element={<Suspense fallback={<PageLoader />}><StudentEnrollmentForm /></Suspense>} />
            <Route path="student-management/student-enrollments/show/:id" element={<Suspense fallback={<PageLoader />}><StudentEnrollmentForm /></Suspense>} />
            <Route path="student-management/parents" element={<Suspense fallback={<PageLoader />}><Parents /></Suspense>} />
            <Route path="student-management/parents/create" element={<Suspense fallback={<PageLoader />}><ParentForm /></Suspense>} />
            <Route path="student-management/parents/edit/:id" element={<Suspense fallback={<PageLoader />}><ParentForm /></Suspense>} />
            <Route path="student-management/parents/show/:id" element={<Suspense fallback={<PageLoader />}><ParentShow /></Suspense>} />
            <Route path="student-management/grades" element={<Suspense fallback={<PageLoader />}><Grades /></Suspense>} />
            <Route path="student-management/grades/create" element={<Suspense fallback={<PageLoader />}><GradeForm /></Suspense>} />
            <Route path="student-management/grades/edit/:id" element={<Suspense fallback={<PageLoader />}><GradeForm /></Suspense>} />
            <Route path="student-management/grades/show/:id" element={<Suspense fallback={<PageLoader />}><GradeShow /></Suspense>} />
            <Route path="student-management/academic-terms" element={<Suspense fallback={<PageLoader />}><AcademicTerms /></Suspense>} />
            <Route path="student-management/academic-terms/create" element={<Suspense fallback={<PageLoader />}><AcademicTermForm /></Suspense>} />
            <Route path="student-management/academic-terms/edit/:id" element={<Suspense fallback={<PageLoader />}><AcademicTermForm /></Suspense>} />
            <Route path="student-management/academic-terms/show/:id" element={<Suspense fallback={<PageLoader />}><AcademicTermShow /></Suspense>} />

            {/* Transportation */}
            <Route path="transportation/routes" element={<Suspense fallback={<PageLoader />}><TransportRoutes /></Suspense>} />
            <Route path="transportation/routes/create" element={<Suspense fallback={<PageLoader />}><RouteForm /></Suspense>} />
            <Route path="transportation/routes/edit/:id" element={<Suspense fallback={<PageLoader />}><RouteForm /></Suspense>} />
            <Route path="transportation/routes/show/:id" element={<Suspense fallback={<PageLoader />}><RouteForm /></Suspense>} />
            <Route path="transportation/vehicles" element={<Suspense fallback={<PageLoader />}><Vehicles /></Suspense>} />
            <Route path="transportation/vehicles/create" element={<Suspense fallback={<PageLoader />}><VehicleForm /></Suspense>} />
            <Route path="transportation/vehicles/edit/:id" element={<Suspense fallback={<PageLoader />}><VehicleForm /></Suspense>} />
            <Route path="transportation/vehicles/show/:id" element={<Suspense fallback={<PageLoader />}><VehicleForm /></Suspense>} />

            {/* Finance */}
            <Route path="finance" element={<Suspense fallback={<PageLoader />}><FinanceDashboard /></Suspense>} />
            <Route path="finance/dashboard" element={<Suspense fallback={<PageLoader />}><FinanceDashboard /></Suspense>} />
            <Route path="finance/accounts" element={<Suspense fallback={<PageLoader />}><FinanceAccounts /></Suspense>} />
            <Route path="finance/accounts/create" element={<Suspense fallback={<PageLoader />}><AccountForm /></Suspense>} />
            <Route path="finance/accounts/edit/:id" element={<Suspense fallback={<PageLoader />}><AccountForm /></Suspense>} />
            <Route path="finance/chart-of-accounts" element={<Suspense fallback={<PageLoader />}><ChartOfAccounts /></Suspense>} />
            <Route path="finance/chart-of-accounts/create" element={<Suspense fallback={<PageLoader />}><ChartOfAccountForm /></Suspense>} />
            <Route path="finance/chart-of-accounts/edit/:id" element={<Suspense fallback={<PageLoader />}><ChartOfAccountForm /></Suspense>} />
            <Route path="finance/invoices" element={<Suspense fallback={<PageLoader />}><Invoices /></Suspense>} />
            <Route path="finance/invoices/create" element={<Suspense fallback={<PageLoader />}><InvoiceForm /></Suspense>} />
            <Route path="finance/invoices/edit/:id" element={<Suspense fallback={<PageLoader />}><InvoiceForm /></Suspense>} />
            <Route path="finance/invoices/show/:id" element={<Suspense fallback={<PageLoader />}><InvoiceForm /></Suspense>} />
            <Route path="finance/payments" element={<Suspense fallback={<PageLoader />}><Payments /></Suspense>} />
            <Route path="finance/payments/create" element={<Suspense fallback={<PageLoader />}><PaymentForm /></Suspense>} />
            <Route path="finance/budgets" element={<Suspense fallback={<PageLoader />}><Budgets /></Suspense>} />
            <Route path="finance/budgets/create" element={<Suspense fallback={<PageLoader />}><BudgetForm /></Suspense>} />
            <Route path="finance/budgets/edit/:id" element={<Suspense fallback={<PageLoader />}><BudgetForm /></Suspense>} />
            <Route path="finance/fee-invoices" element={<Suspense fallback={<PageLoader />}><FeeInvoices /></Suspense>} />
            <Route path="finance/fee-invoices/create" element={<Suspense fallback={<PageLoader />}><FeeInvoiceForm /></Suspense>} />
            <Route path="finance/fee-invoices/edit/:id" element={<Suspense fallback={<PageLoader />}><FeeInvoiceForm /></Suspense>} />
            <Route path="finance/fee-invoices/show/:id" element={<Suspense fallback={<PageLoader />}><FeeInvoiceShow /></Suspense>} />
            <Route path="finance/fee-payments" element={<Suspense fallback={<PageLoader />}><FeePayments /></Suspense>} />
            <Route path="finance/fee-payments/create" element={<Suspense fallback={<PageLoader />}><FeePaymentForm /></Suspense>} />
            <Route path="finance/fee-payments/edit/:id" element={<Suspense fallback={<PageLoader />}><FeePaymentForm /></Suspense>} />
            <Route path="finance/fee-payments/show/:id" element={<Suspense fallback={<PageLoader />}><FeePaymentForm /></Suspense>} />

            {/* Recruitment */}
            <Route path="recruitment/job-requisitions" element={<Suspense fallback={<PageLoader />}><JobRequisitions /></Suspense>} />
            <Route path="recruitment/job-requisitions/create" element={<Suspense fallback={<PageLoader />}><JobRequisitionForm /></Suspense>} />
            <Route path="recruitment/job-requisitions/edit/:id" element={<Suspense fallback={<PageLoader />}><JobRequisitionForm /></Suspense>} />
            <Route path="recruitment/job-requisitions/show/:id" element={<Suspense fallback={<PageLoader />}><JobRequisitionShow /></Suspense>} />
            <Route path="recruitment/job-postings" element={<Suspense fallback={<PageLoader />}><JobPostings /></Suspense>} />
            <Route path="recruitment/job-postings/create" element={<Suspense fallback={<PageLoader />}><JobPostingForm /></Suspense>} />
            <Route path="recruitment/job-postings/edit/:id" element={<Suspense fallback={<PageLoader />}><JobPostingForm /></Suspense>} />
            <Route path="recruitment/job-postings/show/:id" element={<Suspense fallback={<PageLoader />}><JobPostingShow /></Suspense>} />
            <Route path="recruitment/applications" element={<Suspense fallback={<PageLoader />}><Applications /></Suspense>} />
            <Route path="recruitment/applications/create" element={<Suspense fallback={<PageLoader />}><ApplicationForm /></Suspense>} />
            <Route path="recruitment/applications/edit/:id" element={<Suspense fallback={<PageLoader />}><ApplicationForm /></Suspense>} />
            <Route path="recruitment/applications/show/:id" element={<Suspense fallback={<PageLoader />}><ApplicationShow /></Suspense>} />
            <Route path="recruitment/candidate-pool" element={<Suspense fallback={<PageLoader />}><CandidatePool /></Suspense>} />
            <Route path="recruitment/candidate-pool/create" element={<Suspense fallback={<PageLoader />}><CandidatePoolForm /></Suspense>} />
            <Route path="recruitment/candidate-pool/edit/:id" element={<Suspense fallback={<PageLoader />}><CandidatePoolForm /></Suspense>} />
            <Route path="recruitment/candidate-pool/show/:id" element={<Suspense fallback={<PageLoader />}><CandidatePoolShow /></Suspense>} />

            {/* Purchase */}
            <Route path="purchase/purchase-requests" element={<Suspense fallback={<PageLoader />}><PurchaseRequests /></Suspense>} />
            <Route path="purchase/purchase-requests/create" element={<Suspense fallback={<PageLoader />}><PurchaseRequestFormNew /></Suspense>} />
            <Route path="purchase/purchase-requests/edit/:id" element={<Suspense fallback={<PageLoader />}><PurchaseRequestFormNew /></Suspense>} />
            <Route path="purchase/purchase-requests/show/:id" element={<Suspense fallback={<PageLoader />}><PurchaseRequestShowNew /></Suspense>} />
            <Route path="purchase/suppliers" element={<Suspense fallback={<PageLoader />}><Suppliers /></Suspense>} />
            <Route path="purchase/suppliers/create" element={<Suspense fallback={<PageLoader />}><SupplierForm /></Suspense>} />
            <Route path="purchase/suppliers/edit/:id" element={<Suspense fallback={<PageLoader />}><SupplierForm /></Suspense>} />
            <Route path="purchase/suppliers/show/:id" element={<Suspense fallback={<PageLoader />}><SupplierShow /></Suspense>} />
            <Route path="purchase/stock" element={<Suspense fallback={<PageLoader />}><Stock /></Suspense>} />
            <Route path="purchase/stock/create" element={<Suspense fallback={<PageLoader />}><StockForm /></Suspense>} />
            <Route path="purchase/stock/edit/:id" element={<Suspense fallback={<PageLoader />}><StockForm /></Suspense>} />
            <Route path="purchase/stock/show/:id" element={<Suspense fallback={<PageLoader />}><StockShow /></Suspense>} />
            <Route path="purchase/routine-items" element={<Suspense fallback={<PageLoader />}><RoutineItems /></Suspense>} />
            <Route path="purchase/routine-items/create" element={<Suspense fallback={<PageLoader />}><RoutineItemForm /></Suspense>} />
            <Route path="purchase/routine-items/edit/:id" element={<Suspense fallback={<PageLoader />}><RoutineItemForm /></Suspense>} />
            <Route path="purchase/routine-items/show/:id" element={<Suspense fallback={<PageLoader />}><RoutineItemShow /></Suspense>} />
            <Route path="purchase/repair-requests" element={<Suspense fallback={<PageLoader />}><RepairRequests /></Suspense>} />
            <Route path="purchase/repair-requests/create" element={<Suspense fallback={<PageLoader />}><RepairRequestForm /></Suspense>} />
            <Route path="purchase/repair-requests/edit/:id" element={<Suspense fallback={<PageLoader />}><RepairRequestForm /></Suspense>} />
            <Route path="purchase/repair-requests/show/:id" element={<Suspense fallback={<PageLoader />}><RepairRequestShow /></Suspense>} />
            <Route path="purchase/projects" element={<Suspense fallback={<PageLoader />}><Projects /></Suspense>} />
            <Route path="purchase/projects/create" element={<Suspense fallback={<PageLoader />}><ProjectForm /></Suspense>} />
            <Route path="purchase/projects/edit/:id" element={<Suspense fallback={<PageLoader />}><ProjectForm /></Suspense>} />
            <Route path="purchase/projects/show/:id" element={<Suspense fallback={<PageLoader />}><ProjectShow /></Suspense>} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
