import { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";
import Layout from "./components/Layout";
import { AuthProvider } from "./admin/context/AuthContext";
import Protected from "./admin/guards/Protected";

const AdminRoles = lazy(() => import("./admin/pages/AdminRoles"));
const AdminRoleShow = lazy(() => import("./admin/pages/AdminRoleShow"));
const AdminPermissions = lazy(() => import("./admin/pages/AdminPermissions"));
const AdminUsers = lazy(() => import("./admin/pages/AdminUsers"));
const AdminUserShow = lazy(() => import("./admin/pages/AdminUserShow"));
const ActivityLogs = lazy(() => import("./admin/pages/ActivityLogs"));
const Forbidden = lazy(() => import("./admin/pages/Forbidden"));

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
const Notifications = lazy(() => import("./pages/Notifications"));
const Settings = lazy(() => import("./pages/Settings"));

// HR — VATS / Welfare / Holidays (new modules)
const VatsDashboard = lazy(() => import("./pages/hr/VatsDashboard"));
const VatsObservations = lazy(() => import("./pages/hr/VatsObservations"));
const VatsSlips = lazy(() => import("./pages/hr/VatsSlips"));
const VatsCards = lazy(() => import("./pages/hr/VatsCards"));
const VatsInterventions = lazy(() => import("./pages/hr/VatsInterventions"));
const WelfareDashboard = lazy(() => import("./pages/hr/WelfareDashboard"));
const WelfareCheckin = lazy(() => import("./pages/hr/WelfareCheckin"));
const WelfareAlerts = lazy(() => import("./pages/hr/WelfareAlerts"));
const WelfareBenefits = lazy(() => import("./pages/hr/WelfareBenefits"));
const Holidays = lazy(() => import("./pages/hr/Holidays"));

// HR Pages - List
const Staff = lazy(() => import("./pages/hr/Staff"));
const Contracts = lazy(() => import("./pages/hr/Contracts"));
const VendorContracts = lazy(() => import("./pages/hr/VendorContracts"));
const Agreements = lazy(() => import("./pages/hr/Agreements"));
const Attendance = lazy(() => import("./pages/hr/Attendance"));
const QuickAttendance = lazy(() => import("./pages/hr/QuickAttendance"));
const AttendanceReport = lazy(() => import("./pages/hr/AttendanceReport"));
const LeaveRequest = lazy(() => import("./pages/hr/LeaveRequest"));
const Jobs = lazy(() => import("./pages/hr/Jobs"));
const JobApplication = lazy(() => import("./pages/hr/JobApplication"));
const AddVendor = lazy(() => import("./pages/hr/AddVendor"));
const StaffTask = lazy(() => import("./pages/hr/StaffTask"));
const DailyWorks = lazy(() => import("./pages/hr/DailyWorks"));
const EduDashboard = lazy(() => import("./pages/education/EduDashboard"));
const DailyObservation = lazy(() => import("./pages/education/DailyObservation"));
const Monitoring = lazy(() => import("./pages/education/Monitoring"));
const MonitoringRecords = lazy(() => import("./pages/education/MonitoringRecords"));
const Elicitation = lazy(() => import("./pages/education/Elicitation"));
const Synthesis = lazy(() => import("./pages/education/Synthesis"));
const AnnualReview = lazy(() => import("./pages/education/AnnualReview"));
const QuickFourD = lazy(() => import("./pages/education/QuickFourD"));
const StudentCards = lazy(() => import("./pages/education/StudentCards"));
const CardRankings = lazy(() => import("./pages/education/CardRankings"));
const LessonPlanDashboard = lazy(() => import("./pages/education/LessonPlanDashboard"));
const LessonPlanForm = lazy(() => import("./pages/education/LessonPlanForm"));
const MyLessonPlans = lazy(() => import("./pages/education/MyLessonPlans"));
const LessonPlanReview = lazy(() => import("./pages/education/LessonPlanReview"));
const LessonPlanInsights = lazy(() => import("./pages/education/LessonPlanInsights"));
const LessonPlanTemplates = lazy(() => import("./pages/education/LessonPlanTemplates"));
const LessonPlanShow = lazy(() => import("./pages/education/LessonPlanShow"));
const LessonPlanBridge = lazy(() => import("./pages/education/LessonPlanBridge"));
const LessonPlanCurriculum = lazy(() => import("./pages/education/LessonPlanCurriculum"));
const ClassGradebook = lazy(() => import("./pages/education/ClassGradebook"));
const NewAssessment = lazy(() => import("./pages/education/NewAssessment"));
const MarkingScreen = lazy(() => import("./pages/education/MarkingScreen"));
const StudentGradeHistory = lazy(() => import("./pages/education/StudentGradeHistory"));
const HomeworkQueue = lazy(() => import("./pages/education/HomeworkQueue"));
const AssignHomework = lazy(() => import("./pages/education/AssignHomework"));
const TermExamSheet = lazy(() => import("./pages/education/TermExamSheet"));
const PromotionBoard = lazy(() => import("./pages/education/PromotionBoard"));
const StudentAcademicHistory = lazy(() => import("./pages/education/StudentAcademicHistory"));
const GradebookDashboard = lazy(() => import("./pages/education/GradebookDashboard"));
const Planner = lazy(() => import("./pages/hr/Planner"));
const VisitorLog = lazy(() => import("./pages/hr/VisitorLog"));
const Drive = lazy(() => import("./pages/drive/Drive"));
const Questionnaires = lazy(() => import("./pages/questionnaire/Questionnaires"));
const QuestionnaireForm = lazy(() => import("./pages/questionnaire/QuestionnaireForm"));
const QuestionnaireResponses = lazy(() => import("./pages/questionnaire/QuestionnaireResponses"));
const QuestionnaireShow = lazy(() => import("./pages/questionnaire/QuestionnaireShow"));
const MyQuestionnaire = lazy(() => import("./pages/questionnaire/MyQuestionnaire"));
const ParentGradebook = lazy(() => import("./pages/parent/ParentGradebook"));
const HRReports = lazy(() => import("./pages/hr/HRReports"));
const Meetings = lazy(() => import("./pages/hr/Meetings"));
const MeetingForm = lazy(() => import("./pages/hr/MeetingForm"));
const MeetingShow = lazy(() => import("./pages/hr/MeetingShow"));
const Events = lazy(() => import("./pages/hr/Events"));
const EventForm = lazy(() => import("./pages/hr/EventForm"));
const EventShow = lazy(() => import("./pages/hr/EventShow"));
const SalarySnapshot = lazy(() => import("./pages/hr/SalarySnapshot"));

// Planning module — Annual / Monthly / Weekly plans (top-level "Planning" menu).
const PlanningDashboard = lazy(() => import("./pages/planning/PlanningDashboard"));
const MyPlans = lazy(() => import("./pages/planning/MyPlans"));
const PlanForm = lazy(() => import("./pages/planning/PlanForm"));
const PlanShow = lazy(() => import("./pages/planning/PlanShow"));
const PlanApprovals = lazy(() => import("./pages/planning/Approvals"));
const DepartmentPlans = lazy(() => import("./pages/planning/DepartmentPlans"));
const PlanCheckIn = lazy(() => import("./pages/planning/CheckIn"));
const PlanReflect = lazy(() => import("./pages/planning/Reflect"));
const PlanCascadeResult = lazy(() => import("./pages/planning/CascadeResult"));
const PlanTemplates = lazy(() => import("./pages/planning/Templates"));

// HR Pages - Form
const StaffForm = lazy(() => import("./pages/hr/StaffForm"));
const StaffLogs = lazy(() => import("./pages/hr/StaffLogs"));
const ContractsForm = lazy(() => import("./pages/hr/ContractsForm"));
const VendorContractsForm = lazy(() => import("./pages/hr/VendorContractsForm"));
const AgreementsForm = lazy(() => import("./pages/hr/AgreementsForm"));
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
const AgreementsShow = lazy(() => import("./pages/hr/AgreementsShow"));
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
const EnrolledStudents = lazy(() => import("./pages/studentMangement/EnrolledStudents"));
const FoundationRequests = lazy(() => import("./pages/studentMangement/FoundationRequests"));
const FoundationRequestShow = lazy(() => import("./pages/studentMangement/FoundationRequestShow"));
const StudentForm = lazy(() => import("./pages/studentMangement/StudentForm"));
const StudentShow = lazy(() => import("./pages/studentMangement/StudentShow"));
const StudentProfile = lazy(() => import("./pages/studentMangement/StudentProfile"));
const StudentEnrollments = lazy(() => import("./pages/studentMangement/StudentEnrollments"));
const StudentEnrollmentForm = lazy(() => import("./pages/studentMangement/StudentEnrollmentForm"));

// Teacher Management
const Teachers = lazy(() => import("./pages/teacher-management/teacher/Teachers"));
const TeachersForm = lazy(() => import("./pages/teacher-management/teacher/TeachersForm"));
const TeachersShow = lazy(() => import("./pages/teacher-management/teacher/TeachersShow"));

// Branches
const Branches = lazy(() => import("./pages/branches/Branches"));
const BranchForm = lazy(() => import("./pages/branches/BranchForm"));
const BranchShow = lazy(() => import("./pages/branches/BranchShow"));
const Departments = lazy(() => import("./pages/hr/Departments"));
const DepartmentForm = lazy(() => import("./pages/hr/DepartmentForm"));
const PositionTitles = lazy(() => import("./pages/recruitment/PositionTitles"));
const PositionTitleForm = lazy(() => import("./pages/recruitment/PositionTitleForm"));

// Class Management
const Classes = lazy(() => import("./pages/class-management/Classes"));
const ClassesForm = lazy(() => import("./pages/class-management/ClassesForm"));
const ClassesShow = lazy(() => import("./pages/class-management/ClassesShow"));
const ClassStudents = lazy(() => import("./pages/class-management/ClassStudents"));
const GradeSubjects = lazy(() => import("./pages/class-management/GradeSubjects"));
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
const PublicApplicationForm = lazy(() => import("./pages/recruitment/PublicApplicationForm"));
const PublicQuestionnaire = lazy(() => import("./pages/public/PublicQuestionnaire"));
const CandidatePool = lazy(() => import("./pages/recruitment/CandidatePool"));
const CandidatePoolForm = lazy(() => import("./pages/recruitment/CandidatePoolForm"));
const CandidatePoolShow = lazy(() => import("./pages/recruitment/CandidatePoolShow"));

// Finance
const FeePayments = lazy(() => import("./pages/finance/FeePayments"));
const FeePaymentForm = lazy(() => import("./pages/finance/FeePaymentForm"));
const FinanceDashboard = lazy(() => import("./pages/finance/FinanceDashboard"));
const BalanceSheet = lazy(() => import("./pages/finance/BalanceSheet"));
const MonthlyReport = lazy(() => import("./pages/finance/MonthlyReport"));
const QuickEntry = lazy(() => import("./pages/finance/QuickEntry"));
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
const BillingRun = lazy(() => import("./pages/finance/BillingRun"));
const Payroll = lazy(() => import("./pages/finance/Payroll"));
const Cashier = lazy(() => import("./pages/finance/Cashier"));
const StudentPayments = lazy(() => import("./pages/finance/StudentPayments"));
const ClassCollectionReport = lazy(() => import("./pages/finance/ClassCollectionReport"));
const LeadershipReport = lazy(() => import("./pages/finance/LeadershipReport"));
const FinanceInbox = lazy(() => import("./pages/finance/FinanceInbox"));
const Parties = lazy(() => import("./pages/finance/Parties"));
const PartyForm = lazy(() => import("./pages/finance/PartyForm"));
const PartyLedger = lazy(() => import("./pages/finance/PartyLedger"));
const JournalEntries = lazy(() => import("./pages/finance/JournalEntries"));
const JournalEntryForm = lazy(() => import("./pages/finance/JournalEntryForm"));
const JournalEntryShow = lazy(() => import("./pages/finance/JournalEntryShow"));

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
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const token = localStorage.getItem("token");
  return !token ? children : <Navigate to="/" replace />;
}

// Old per-student statement URL → forward to Cashier with that student preselected.
function RedirectToCashier() {
  const { studentId } = useParams();
  return <Navigate to={`/finance/cashier${studentId ? `?student_id=${studentId}` : ""}`} replace />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<PublicRoute>{L(() => import("./pages/Login"))}</PublicRoute>} />
            <Route path="/403" element={<Suspense fallback={<PageLoader />}><Forbidden /></Suspense>} />

            {/* Public careers page — shareable link, no login required */}
            <Route path="/careers/apply" element={<Suspense fallback={<PageLoader />}><PublicApplicationForm /></Suspense>} />
            <Route path="/apply" element={<Navigate to="/careers/apply" replace />} />

            {/* Public weekly questionnaire — shareable link, no login required */}
            <Route path="/questionnaire" element={<Suspense fallback={<PageLoader />}><PublicQuestionnaire /></Suspense>} />
            <Route path="/parent-questionnaire" element={<Navigate to="/questionnaire" replace />} />

            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
            <Route path="departments" element={<Navigate to="/hr/departments" replace />} />
            <Route path="payroll" element={<Placeholder title="Payroll" />} />
            <Route path="leave-requests" element={<Placeholder title="Leave Requests" />} />
            <Route path="number-puzzle" element={<Placeholder title="Number Puzzle" />} />
            <Route path="profile" element={<Suspense fallback={<PageLoader />}><MyProfile /></Suspense>} />
            <Route path="profile/:userId" element={<Suspense fallback={<PageLoader />}><MyProfile /></Suspense>} />
            <Route path="notifications" element={<Suspense fallback={<PageLoader />}><Notifications /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
            <Route path="support" element={<Placeholder title="Support" />} />

            {/* Teacher Management */}
            <Route path="teacher-management/teachers" element={<Suspense fallback={<PageLoader />}><Teachers /></Suspense>} />
            <Route path="teacher-management/teachers/create" element={<Suspense fallback={<PageLoader />}><TeachersForm /></Suspense>} />
            <Route path="teacher-management/teachers/edit/:id" element={<Suspense fallback={<PageLoader />}><TeachersForm /></Suspense>} />
            <Route path="teacher-management/teachers/show/:id" element={<Suspense fallback={<PageLoader />}><TeachersShow /></Suspense>} />

            {/* Class Management */}
            <Route path="class-management/teachers" element={<Navigate to="/teacher-management/teachers" replace />} />
            <Route path="branches" element={<Suspense fallback={<PageLoader />}><Branches /></Suspense>} />
            <Route path="branches/create" element={<Suspense fallback={<PageLoader />}><BranchForm /></Suspense>} />
            <Route path="branches/edit/:id" element={<Suspense fallback={<PageLoader />}><BranchForm /></Suspense>} />
            <Route path="branches/show/:id" element={<Suspense fallback={<PageLoader />}><BranchShow /></Suspense>} />

            {/* Drive — private per-user file manager */}
            <Route path="drive" element={<Suspense fallback={<PageLoader />}><Drive /></Suspense>} />

            {/* Questionnaires — weekly parent evaluations */}
            <Route path="questionnaires" element={<Suspense fallback={<PageLoader />}><Questionnaires /></Suspense>} />
            <Route path="questionnaires/create" element={<Suspense fallback={<PageLoader />}><QuestionnaireForm /></Suspense>} />
            <Route path="questionnaires/edit/:id" element={<Suspense fallback={<PageLoader />}><QuestionnaireForm /></Suspense>} />
            <Route path="questionnaires/:id/responses" element={<Suspense fallback={<PageLoader />}><QuestionnaireResponses /></Suspense>} />
            <Route path="questionnaires/:id" element={<Suspense fallback={<PageLoader />}><QuestionnaireShow /></Suspense>} />
            {/* Parent's own questionnaire (reached from the bell notification) */}
            <Route path="my-questionnaire" element={<Suspense fallback={<PageLoader />}><MyQuestionnaire /></Suspense>} />
            <Route path="my-children" element={<Suspense fallback={<PageLoader />}><ParentGradebook /></Suspense>} />

            {/* Planning — Annual / Monthly / Weekly plans */}
            <Route path="planning" element={<Suspense fallback={<PageLoader />}><PlanningDashboard /></Suspense>} />
            <Route path="planning/dashboard" element={<Suspense fallback={<PageLoader />}><PlanningDashboard /></Suspense>} />
            <Route path="planning/plans" element={<Suspense fallback={<PageLoader />}><MyPlans /></Suspense>} />
            <Route path="planning/plans/create" element={<Suspense fallback={<PageLoader />}><PlanForm /></Suspense>} />
            <Route path="planning/plans/edit/:id" element={<Suspense fallback={<PageLoader />}><PlanForm /></Suspense>} />
            <Route path="planning/plans/show/:id" element={<Suspense fallback={<PageLoader />}><PlanShow /></Suspense>} />
            <Route path="planning/plans/checkin/:id" element={<Suspense fallback={<PageLoader />}><PlanCheckIn /></Suspense>} />
            <Route path="planning/plans/reflect/:id" element={<Suspense fallback={<PageLoader />}><PlanReflect /></Suspense>} />
            <Route path="planning/plans/cascade/:id" element={<Suspense fallback={<PageLoader />}><PlanCascadeResult /></Suspense>} />
            <Route path="planning/approvals" element={<Suspense fallback={<PageLoader />}><PlanApprovals /></Suspense>} />
            <Route path="planning/department" element={<Suspense fallback={<PageLoader />}><DepartmentPlans /></Suspense>} />
            <Route path="planning/templates" element={<Suspense fallback={<PageLoader />}><PlanTemplates /></Suspense>} />
            <Route path="hr/departments" element={<Suspense fallback={<PageLoader />}><Departments /></Suspense>} />
            <Route path="hr/departments/create" element={<Suspense fallback={<PageLoader />}><DepartmentForm /></Suspense>} />
            <Route path="hr/departments/edit/:id" element={<Suspense fallback={<PageLoader />}><DepartmentForm /></Suspense>} />
            <Route path="recruitment/position-titles" element={<Suspense fallback={<PageLoader />}><PositionTitles /></Suspense>} />
            <Route path="recruitment/position-titles/create" element={<Suspense fallback={<PageLoader />}><PositionTitleForm /></Suspense>} />
            <Route path="recruitment/position-titles/edit/:id" element={<Suspense fallback={<PageLoader />}><PositionTitleForm /></Suspense>} />
            <Route path="class-management/classes" element={<Suspense fallback={<PageLoader />}><Classes /></Suspense>} />
            <Route path="class-management/classes/create" element={<Suspense fallback={<PageLoader />}><ClassesForm /></Suspense>} />
            <Route path="class-management/classes/edit/:id" element={<Suspense fallback={<PageLoader />}><ClassesForm /></Suspense>} />
            <Route path="class-management/classes/show/:id" element={<Suspense fallback={<PageLoader />}><ClassesShow /></Suspense>} />
            <Route path="class-management/classes/students/:id" element={<Suspense fallback={<PageLoader />}><ClassStudents /></Suspense>} />
            <Route path="class-management/grade-subjects" element={<Suspense fallback={<PageLoader />}><GradeSubjects /></Suspense>} />
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
            <Route path="hr/agreements" element={<Suspense fallback={<PageLoader />}><Agreements /></Suspense>} />
            <Route path="hr/agreements/create" element={<Suspense fallback={<PageLoader />}><AgreementsForm /></Suspense>} />
            <Route path="hr/agreements/edit/:id" element={<Suspense fallback={<PageLoader />}><AgreementsForm /></Suspense>} />
            <Route path="hr/agreements/show/:id" element={<Suspense fallback={<PageLoader />}><AgreementsShow /></Suspense>} />
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
            <Route path="hr/daily-works" element={<Suspense fallback={<PageLoader />}><DailyWorks /></Suspense>} />
            <Route path="education/dashboard" element={<Suspense fallback={<PageLoader />}><EduDashboard /></Suspense>} />
            <Route path="education/observations" element={<Suspense fallback={<PageLoader />}><DailyObservation /></Suspense>} />
            <Route path="education/monitoring" element={<Suspense fallback={<PageLoader />}><Monitoring /></Suspense>} />
            <Route path="education/monitoring/:monitoringId/records" element={<Suspense fallback={<PageLoader />}><MonitoringRecords /></Suspense>} />
            <Route path="education/elicitation" element={<Suspense fallback={<PageLoader />}><Elicitation /></Suspense>} />
            <Route path="education/synthesis" element={<Suspense fallback={<PageLoader />}><Synthesis /></Suspense>} />
            <Route path="education/annual-review" element={<Suspense fallback={<PageLoader />}><AnnualReview /></Suspense>} />
            <Route path="education/4d-self-rating" element={<Suspense fallback={<PageLoader />}><QuickFourD /></Suspense>} />
            <Route path="education/cards" element={<Suspense fallback={<PageLoader />}><StudentCards /></Suspense>} />
            <Route path="education/card-rankings" element={<Suspense fallback={<PageLoader />}><CardRankings /></Suspense>} />
            <Route path="education/lesson-plans" element={<Suspense fallback={<PageLoader />}><LessonPlanDashboard /></Suspense>} />
            <Route path="education/lesson-plans/my" element={<Suspense fallback={<PageLoader />}><MyLessonPlans /></Suspense>} />
            <Route path="education/lesson-plans/create" element={<Suspense fallback={<PageLoader />}><LessonPlanForm /></Suspense>} />
            <Route path="education/lesson-plans/edit/:id" element={<Suspense fallback={<PageLoader />}><LessonPlanForm /></Suspense>} />
            <Route path="education/lesson-plans/show/:id" element={<Suspense fallback={<PageLoader />}><LessonPlanShow /></Suspense>} />
            <Route path="education/lesson-plans/review" element={<Suspense fallback={<PageLoader />}><LessonPlanReview /></Suspense>} />
            <Route path="education/lesson-plans/insights" element={<Suspense fallback={<PageLoader />}><LessonPlanInsights /></Suspense>} />
            <Route path="education/lesson-plans/bridge" element={<Suspense fallback={<PageLoader />}><LessonPlanBridge /></Suspense>} />
            <Route path="education/lesson-plans/balance" element={<Suspense fallback={<PageLoader />}><LessonPlanInsights initialTab="balance" /></Suspense>} />
            <Route path="education/lesson-plans/coverage" element={<Suspense fallback={<PageLoader />}><LessonPlanInsights initialTab="coverage" /></Suspense>} />
            <Route path="education/lesson-plans/curriculum" element={<Suspense fallback={<PageLoader />}><LessonPlanCurriculum /></Suspense>} />
            <Route path="education/lesson-plans/templates" element={<Suspense fallback={<PageLoader />}><LessonPlanTemplates /></Suspense>} />

            {/* Gradebook + Homework */}
            <Route path="education/gradebook" element={<Suspense fallback={<PageLoader />}><ClassGradebook /></Suspense>} />
            <Route path="education/gradebook/mark" element={<Suspense fallback={<PageLoader />}><MarkingScreen /></Suspense>} />
            <Route path="education/gradebook/assessments/new" element={<Suspense fallback={<PageLoader />}><NewAssessment /></Suspense>} />
            <Route path="education/gradebook/homework" element={<Suspense fallback={<PageLoader />}><HomeworkQueue /></Suspense>} />
            <Route path="education/gradebook/homework/new" element={<Suspense fallback={<PageLoader />}><AssignHomework /></Suspense>} />
            <Route path="education/gradebook/analytics" element={<Suspense fallback={<PageLoader />}><GradebookDashboard /></Suspense>} />
            <Route path="education/gradebook/student/:studentId/subject/:subjectId" element={<Suspense fallback={<PageLoader />}><StudentGradeHistory /></Suspense>} />
            <Route path="education/gradebook/term-exams" element={<Suspense fallback={<PageLoader />}><TermExamSheet /></Suspense>} />
            <Route path="education/gradebook/promotion" element={<Suspense fallback={<PageLoader />}><PromotionBoard /></Suspense>} />
            <Route path="education/gradebook/student/:studentId/academic-history" element={<Suspense fallback={<PageLoader />}><StudentAcademicHistory /></Suspense>} />
            <Route path="hr/planner" element={<Suspense fallback={<PageLoader />}><Planner /></Suspense>} />
            <Route path="hr/planner/create" element={<Suspense fallback={<PageLoader />}><PlannerForm /></Suspense>} />
            <Route path="hr/planner/edit/:id" element={<Suspense fallback={<PageLoader />}><PlannerForm /></Suspense>} />
            <Route path="hr/planner/show/:id" element={<Suspense fallback={<PageLoader />}><PlannerShow /></Suspense>} />
            <Route path="hr/visitor-log" element={<Suspense fallback={<PageLoader />}><VisitorLog /></Suspense>} />
            <Route path="hr/visitor-log/create" element={<Suspense fallback={<PageLoader />}><VisitorLogForm /></Suspense>} />
            <Route path="hr/visitor-log/edit/:id" element={<Suspense fallback={<PageLoader />}><VisitorLogForm /></Suspense>} />
            <Route path="hr/visitor-log/show/:id" element={<Suspense fallback={<PageLoader />}><VisitorLogShow /></Suspense>} />
            <Route path="hr/reports" element={<Suspense fallback={<PageLoader />}><HRReports /></Suspense>} />

            {/* HR — VATS, Welfare, Holidays */}
            <Route path="hr/vats" element={<Suspense fallback={<PageLoader />}><VatsDashboard /></Suspense>} />
            <Route path="hr/vats/observations" element={<Suspense fallback={<PageLoader />}><VatsObservations /></Suspense>} />
            <Route path="hr/vats/slips" element={<Suspense fallback={<PageLoader />}><VatsSlips /></Suspense>} />
            <Route path="hr/vats/cards" element={<Suspense fallback={<PageLoader />}><VatsCards /></Suspense>} />
            <Route path="hr/vats/interventions" element={<Suspense fallback={<PageLoader />}><VatsInterventions /></Suspense>} />
            <Route path="hr/welfare" element={<Suspense fallback={<PageLoader />}><WelfareDashboard /></Suspense>} />
            <Route path="hr/welfare/checkin" element={<Suspense fallback={<PageLoader />}><WelfareCheckin /></Suspense>} />
            <Route path="hr/welfare/alerts" element={<Suspense fallback={<PageLoader />}><WelfareAlerts /></Suspense>} />
            <Route path="hr/welfare/benefits" element={<Suspense fallback={<PageLoader />}><WelfareBenefits /></Suspense>} />
            <Route path="hr/holidays" element={<Suspense fallback={<PageLoader />}><Holidays /></Suspense>} />

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
            <Route path="student-management/enrolled-students" element={<Suspense fallback={<PageLoader />}><EnrolledStudents /></Suspense>} />
            <Route path="student-management/students/create" element={<Suspense fallback={<PageLoader />}><StudentForm /></Suspense>} />
            <Route path="student-management/students/edit/:id" element={<Suspense fallback={<PageLoader />}><StudentForm /></Suspense>} />
            <Route path="student-management/students/show/:id" element={<Suspense fallback={<PageLoader />}><StudentShow /></Suspense>} />
            <Route path="student-management/students/profile/:id" element={<Suspense fallback={<PageLoader />}><StudentProfile /></Suspense>} />
            <Route path="student-management/foundation-requests" element={<Suspense fallback={<PageLoader />}><FoundationRequests /></Suspense>} />
            <Route path="student-management/foundation-requests/show/:id" element={<Suspense fallback={<PageLoader />}><FoundationRequestShow /></Suspense>} />
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
            <Route path="finance/balance-sheet" element={<Suspense fallback={<PageLoader />}><BalanceSheet /></Suspense>} />
            <Route path="finance/monthly-report" element={<Suspense fallback={<PageLoader />}><MonthlyReport /></Suspense>} />
            <Route path="finance/quick-entry" element={<Suspense fallback={<PageLoader />}><QuickEntry /></Suspense>} />
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
            <Route path="finance/billing-runs" element={<Suspense fallback={<PageLoader />}><BillingRun /></Suspense>} />
            <Route path="finance/payroll" element={<Suspense fallback={<PageLoader />}><Payroll /></Suspense>} />
            <Route path="finance/cashier" element={<Suspense fallback={<PageLoader />}><Cashier /></Suspense>} />
            <Route path="finance/students/:studentId/payments" element={<Suspense fallback={<PageLoader />}><StudentPayments /></Suspense>} />
            <Route path="finance/reports/class-collection" element={<Suspense fallback={<PageLoader />}><ClassCollectionReport /></Suspense>} />
            <Route path="finance/reports/leadership" element={<Suspense fallback={<PageLoader />}><LeadershipReport /></Suspense>} />
            {/* Old paths now redirect to the single Cashier flow. */}
            <Route path="finance/fee-payments/create" element={<Navigate to="/finance/cashier" replace />} />
            <Route path="finance/student-statements" element={<Navigate to="/finance/cashier" replace />} />
            <Route path="finance/students/:studentId/statement" element={<RedirectToCashier />} />
            <Route path="finance/fee-invoices" element={<Suspense fallback={<PageLoader />}><FeeInvoices /></Suspense>} />
            <Route path="finance/fee-invoices/create" element={<Suspense fallback={<PageLoader />}><FeeInvoiceForm /></Suspense>} />
            <Route path="finance/fee-invoices/edit/:id" element={<Suspense fallback={<PageLoader />}><FeeInvoiceForm /></Suspense>} />
            <Route path="finance/fee-invoices/show/:id" element={<Suspense fallback={<PageLoader />}><FeeInvoiceShow /></Suspense>} />
            <Route path="finance/fee-payments" element={<Suspense fallback={<PageLoader />}><FeePayments /></Suspense>} />
            {/* /finance/fee-payments/create is handled above by redirect to /finance/cashier */}
            <Route path="finance/fee-payments/edit/:id" element={<Suspense fallback={<PageLoader />}><FeePaymentForm /></Suspense>} />
            <Route path="finance/fee-payments/show/:id" element={<Suspense fallback={<PageLoader />}><FeePaymentForm /></Suspense>} />
            <Route path="finance/journal-entries" element={<Suspense fallback={<PageLoader />}><JournalEntries /></Suspense>} />
            <Route path="finance/journal-entries/create" element={<Suspense fallback={<PageLoader />}><JournalEntryForm /></Suspense>} />
            <Route path="finance/journal-entries/show/:id" element={<Suspense fallback={<PageLoader />}><JournalEntryShow /></Suspense>} />
            <Route path="finance/parties" element={<Suspense fallback={<PageLoader />}><Parties /></Suspense>} />
            <Route path="finance/parties/create" element={<Suspense fallback={<PageLoader />}><PartyForm /></Suspense>} />
            <Route path="finance/parties/:id/ledger" element={<Suspense fallback={<PageLoader />}><PartyLedger /></Suspense>} />
            <Route path="finance/inbox" element={<Suspense fallback={<PageLoader />}><FinanceInbox /></Suspense>} />

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

            {/* ===== Admin: Access Control ===== */}
            <Route path="admin/roles" element={
              <Protected permission="roles.view">
                <Suspense fallback={<PageLoader />}><AdminRoles /></Suspense>
              </Protected>
            } />
            <Route path="admin/roles/:id" element={
              <Protected permission="roles.view">
                <Suspense fallback={<PageLoader />}><AdminRoleShow /></Suspense>
              </Protected>
            } />
            <Route path="admin/permissions" element={
              <Protected permission="permissions.view">
                <Suspense fallback={<PageLoader />}><AdminPermissions /></Suspense>
              </Protected>
            } />
            <Route path="admin/users" element={
              <Protected permission="users.view">
                <Suspense fallback={<PageLoader />}><AdminUsers /></Suspense>
              </Protected>
            } />
            <Route path="admin/users/:id" element={
              <Protected permission="users.view">
                <Suspense fallback={<PageLoader />}><AdminUserShow /></Suspense>
              </Protected>
            } />
            <Route path="admin/activity-logs" element={
              <Protected permission="activity-logs.view">
                <Suspense fallback={<PageLoader />}><ActivityLogs /></Suspense>
              </Protected>
            } />
          </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </Router>
  );
}

export default App;
