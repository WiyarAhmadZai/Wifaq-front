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

// Student Management Pages
import Parents from "./pages/studentMangement/Parents";
import ParentForm from "./pages/studentMangement/ParentForm";
import ParentShow from "./pages/studentMangement/ParentShow";
import AcademicTerms from "./pages/studentMangement/AcademicTerms";
import Grades from "./pages/studentMangement/Grades";
import GradeForm from "./pages/studentMangement/GradeForm";
import GradeShow from "./pages/studentMangement/GradeShow";
import AcademicTermForm from "./pages/studentMangement/AcademicTermForm";
import AcademicTermShow from "./pages/studentMangement/AcademicTermShow";
import TransportRoutes from "./pages/studentMangement/Routes";
import RouteForm from "./pages/studentMangement/RouteForm";
import Vehicles from "./pages/studentMangement/Vehicles";
import VehicleForm from "./pages/studentMangement/VehicleForm";
import Students from "./pages/studentMangement/Students";
import StudentForm from "./pages/studentMangement/StudentForm";
import StudentEnrollments from "./pages/studentMangement/StudentEnrollments";
import StudentEnrollmentForm from "./pages/studentMangement/StudentEnrollmentForm";

// Finance Pages
import FeePayments from "./pages/finance/FeePayments";
import FeePaymentForm from "./pages/finance/FeePaymentForm";

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

// Teacher Management Pages
import AnnualPlans from "./pages/teacher-management/AnnualPlans";
import LessonPlans from "./pages/teacher-management/LessonPlans";
import Teachers from "./pages/teacher-management/teacher/Teachers";
import TeachersForm from "./pages/teacher-management/teacher/TeachersForm";
import TeachersShow from "./pages/teacher-management/teacher/TeachersShow";
import TeacherSubjects from "./pages/teacher-management/teacher-subjects/TeacherSubjects";
import TeacherSubjectForm from "./pages/teacher-management/teacher-subjects/TeacherSubjectForm";
import TeacherSubjectShow from "./pages/teacher-management/teacher-subjects/TeacherSubjectShow";

// Branches Pages
import Branches from "./pages/branches/Branches";
import BranchForm from "./pages/branches/BranchForm";
import BranchShow from "./pages/branches/BranchShow";

// Class Management Pages
import ClassesForm from "./pages/class-management/ClassesForm";
import Classes from "./pages/class-management/Classes";
import ClassesShow from "./pages/class-management/ClassesShow";
import SubjectsForm from "./pages/class-management/SubjectsForm";
import Subjects from "./pages/class-management/Subjects";
import SubjectsShow from "./pages/class-management/SubjectsShow";
import ExamsForm from "./pages/class-management/ExamsForm";
import Exams from "./pages/class-management/Exams";
import ExamsShow from "./pages/class-management/ExamsShow";
import Schedule from "./pages/class-management/Schedule";
import ScheduleForm from "./pages/class-management/ScheduleForm";
import ScheduleShow from "./pages/class-management/ScheduleShow";

// Recruitment Pages
import JobRequisitions from "./pages/recruitment/JobRequisitions";
import JobRequisitionForm from "./pages/recruitment/JobRequisitionForm";
import JobRequisitionShow from "./pages/recruitment/JobRequisitionShow";
import JobPostings from "./pages/recruitment/JobPostings";
import JobPostingForm from "./pages/recruitment/JobPostingForm";
import JobPostingShow from "./pages/recruitment/JobPostingShow";
import Applications from "./pages/recruitment/Applications";
import ApplicationForm from "./pages/recruitment/ApplicationForm";
import ApplicationShow from "./pages/recruitment/ApplicationShow";
import CandidatePool from "./pages/recruitment/CandidatePool";

// Student Registration Pages

const Placeholder = ({ title }) => (
  <div className="p-4 sm:p-6">
    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">
      {title}
    </h2>
    <p className="text-gray-600">This page is under development.</p>
  </div>
);

// DEV MODE: Auth disabled — comment these back in to re-enable login protection
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

          {/* Teacher Management Routes */}
          <Route
            path="teacher-management/annual-plans"
            element={<AnnualPlans />}
          />
          <Route
            path="teacher-management/annual-plans/create"
            element={<Placeholder title="Create Annual Plan" />}
          />
          <Route
            path="teacher-management/annual-plans/edit/:id"
            element={<Placeholder title="Edit Annual Plan" />}
          />
          <Route
            path="teacher-management/annual-plans/show/:id"
            element={<Placeholder title="View Annual Plan" />}
          />

          <Route
            path="teacher-management/lesson-plans"
            element={<LessonPlans />}
          />
          <Route
            path="teacher-management/lesson-plans/create"
            element={<Placeholder title="Create Lesson Plan" />}
          />
          <Route
            path="teacher-management/lesson-plans/edit/:id"
            element={<Placeholder title="Edit Lesson Plan" />}
          />
          <Route
            path="teacher-management/lesson-plans/show/:id"
            element={<Placeholder title="View Lesson Plan" />}
          />

          <Route path="teacher-management/teachers" element={<Teachers />} />
          <Route
            path="teacher-management/teachers/create"
            element={<TeachersForm />}
          />
          <Route
            path="teacher-management/teachers/edit/:id"
            element={<TeachersForm />}
          />
          <Route
            path="teacher-management/teachers/show/:id"
            element={<TeachersShow />}
          />

          {/* Teacher Management Routes - Teacher-Subject Assignments */}
          <Route path="teacher-management/teacher-subjects" element={<TeacherSubjects />} />
          <Route
            path="teacher-management/teacher-subjects/create"
            element={<TeacherSubjectForm />}
          />
          <Route
            path="teacher-management/teacher-subjects/edit/:id"
            element={<TeacherSubjectForm />}
          />
          <Route
            path="teacher-management/teacher-subjects/show/:id"
            element={<TeacherSubjectShow />}
          />

          {/* Class Management Routes - Redirect to Teacher Management */}
          <Route
            path="class-management/teachers"
            element={<Navigate to="/teacher-management/teachers" replace />}
          />
          <Route
            path="class-management/teachers/create"
            element={<TeachersForm />}
          />
          <Route
            path="class-management/teachers/edit/:id"
            element={<TeachersForm />}
          />
          <Route
            path="class-management/teachers/show/:id"
            element={<TeachersShow />}
          />

          {/* Branches Routes */}
          <Route path="branches" element={<Branches />} />
          <Route path="branches/create" element={<BranchForm />} />
          <Route path="branches/edit/:id" element={<BranchForm />} />
          <Route path="branches/show/:id" element={<BranchShow />} />

          {/* Class Management Routes - Classes */}
          <Route path="class-management/classes" element={<Classes />} />
          <Route
            path="class-management/classes/create"
            element={<ClassesForm />}
          />
          <Route
            path="class-management/classes/edit/:id"
            element={<ClassesForm />}
          />
          <Route
            path="class-management/classes/show/:id"
            element={<ClassesShow />}
          />

          {/* Class Management Routes - Subjects */}
          <Route path="class-management/subjects" element={<Subjects />} />
          <Route
            path="class-management/subjects/create"
            element={<SubjectsForm />}
          />
          <Route
            path="class-management/subjects/edit/:id"
            element={<SubjectsForm />}
          />
          <Route
            path="class-management/subjects/show/:id"
            element={<SubjectsShow />}
          />

          {/* Class Management Routes - Exams */}
          <Route path="class-management/exams" element={<Exams />} />
          <Route path="class-management/exams/create" element={<ExamsForm />} />
          <Route
            path="class-management/exams/edit/:id"
            element={<ExamsForm />}
          />
          <Route
            path="class-management/exams/show/:id"
            element={<ExamsShow />}
          />

          {/* Class Management Routes - Schedule */}
          <Route path="class-management/schedule" element={<Schedule />} />
          <Route
            path="class-management/schedule/create"
            element={<ScheduleForm />}
          />
          <Route
            path="class-management/schedule/edit/:id"
            element={<ScheduleForm />}
          />
          <Route
            path="class-management/schedule/show/:id"
            element={<ScheduleShow />}
          />

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

          {/* Student Management Routes */}
          <Route path="student-management/students" element={<Students />} />
          <Route
            path="student-management/students/create"
            element={<StudentForm />}
          />
          <Route
            path="student-management/students/edit/:id"
            element={<StudentForm />}
          />
          <Route
            path="student-management/students/show/:id"
            element={<StudentForm />}
          />

          {/* Student Enrollments */}
          <Route
            path="student-management/student-enrollments"
            element={<StudentEnrollments />}
          />
          <Route
            path="student-management/student-enrollments/create"
            element={<StudentEnrollmentForm />}
          />
          <Route
            path="student-management/student-enrollments/edit/:id"
            element={<StudentEnrollmentForm />}
          />
          <Route
            path="student-management/student-enrollments/show/:id"
            element={<StudentEnrollmentForm />}
          />

          <Route path="student-management/parents" element={<Parents />} />
          <Route
            path="student-management/parents/create"
            element={<ParentForm />}
          />
          <Route
            path="student-management/parents/edit/:id"
            element={<ParentForm />}
          />
          <Route
            path="student-management/parents/show/:id"
            element={<ParentShow />}
          />

          {/* Grades */}
          <Route path="student-management/grades" element={<Grades />} />
          <Route
            path="student-management/grades/create"
            element={<GradeForm />}
          />
          <Route
            path="student-management/grades/edit/:id"
            element={<GradeForm />}
          />
          <Route
            path="student-management/grades/show/:id"
            element={<GradeShow />}
          />

          {/* Academic Terms */}
          <Route
            path="student-management/academic-terms"
            element={<AcademicTerms />}
          />
          <Route
            path="student-management/academic-terms/create"
            element={<AcademicTermForm />}
          />
          <Route
            path="student-management/academic-terms/edit/:id"
            element={<AcademicTermForm />}
          />
          <Route
            path="student-management/academic-terms/show/:id"
            element={<AcademicTermShow />}
          />

          {/* Transportation Routes */}
          <Route path="transportation/routes" element={<TransportRoutes />} />
          <Route path="transportation/routes/create" element={<RouteForm />} />
          <Route
            path="transportation/routes/edit/:id"
            element={<RouteForm />}
          />
          <Route
            path="transportation/routes/show/:id"
            element={<RouteForm />}
          />

          {/* Transportation Vehicles */}
          <Route path="transportation/vehicles" element={<Vehicles />} />
          <Route
            path="transportation/vehicles/create"
            element={<VehicleForm />}
          />
          <Route
            path="transportation/vehicles/edit/:id"
            element={<VehicleForm />}
          />
          <Route
            path="transportation/vehicles/show/:id"
            element={<VehicleForm />}
          />

          {/* Finance Routes - Fee Payments */}
          <Route path="finance/fee-payments" element={<FeePayments />} />
          <Route
            path="finance/fee-payments/create"
            element={<FeePaymentForm />}
          />
          <Route
            path="finance/fee-payments/edit/:id"
            element={<FeePaymentForm />}
          />
          <Route
            path="finance/fee-payments/show/:id"
            element={<FeePaymentForm />}
          />
          {/* Recruitment Routes - Job Requisitions */}
          <Route path="recruitment/job-requisitions" element={<JobRequisitions />} />
          <Route path="recruitment/job-requisitions/create" element={<JobRequisitionForm />} />
          <Route path="recruitment/job-requisitions/edit/:id" element={<JobRequisitionForm />} />
          <Route path="recruitment/job-requisitions/show/:id" element={<JobRequisitionShow />} />

          {/* Recruitment Routes - Job Postings */}
          <Route path="recruitment/job-postings" element={<JobPostings />} />
          <Route path="recruitment/job-postings/create" element={<JobPostingForm />} />
          <Route path="recruitment/job-postings/edit/:id" element={<JobPostingForm />} />
          <Route path="recruitment/job-postings/show/:id" element={<JobPostingShow />} />

          {/* Recruitment Routes - Applications (central hub for interviews, offers, decisions) */}
          <Route path="recruitment/applications" element={<Applications />} />
          <Route path="recruitment/applications/create" element={<ApplicationForm />} />
          <Route path="recruitment/applications/edit/:id" element={<ApplicationForm />} />
          <Route path="recruitment/applications/show/:id" element={<ApplicationShow />} />

          {/* Recruitment Routes - Candidate Pool */}
          <Route path="recruitment/candidate-pool" element={<CandidatePool />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
