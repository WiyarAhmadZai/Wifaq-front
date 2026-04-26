/**
 * Map URL paths → permission name. Order matters: longer/more-specific prefixes first.
 * If a path doesn't match any rule, it's considered an "untagged" page —
 * accessible only to super-admin (defense in depth, matches the sidebar default).
 *
 * Always-allowed paths (login, 403, dashboard, profile, etc.) are listed under PUBLIC_PATHS.
 */

const RULES = [
  // Admin / access control
  { prefix: "/admin/roles", permission: "roles.view" },
  { prefix: "/admin/permissions", permission: "permissions.view" },
  { prefix: "/admin/users", permission: "users.view" },

  // Branches
  { prefix: "/branches", permission: "branches.view" },

  // Teacher management
  { prefix: "/teacher-management/teachers", permission: "teachers.view" },

  // Class management
  { prefix: "/class-management/classes", permission: "classes.view" },
  { prefix: "/class-management/subjects", permission: "subjects.view" },
  { prefix: "/class-management/grade-subjects", permission: "grade-subjects.view" },
  { prefix: "/class-management/schedule", permission: "schedule.view" },
  { prefix: "/class-management/exams", permission: "classes.view" }, // legacy — share classes perm

  // HR
  { prefix: "/hr/salary-snapshot", permission: "salary-snapshot.view" },
  { prefix: "/hr/staff-logs", permission: "staff-logs.view" },
  { prefix: "/hr/staff-task", permission: "staff-task.view" },
  { prefix: "/hr/staff", permission: "staff.view" },
  { prefix: "/hr/contracts", permission: "contracts.view" },
  { prefix: "/hr/vendor-contracts", permission: "vendor-contracts.view" },
  { prefix: "/hr/agreements", permission: "agreements.view" },
  { prefix: "/hr/attendance", permission: "attendance.view" },
  { prefix: "/hr/leave-request", permission: "leave-request.view" },
  { prefix: "/hr/add-vendor", permission: "vendors.view" },
  { prefix: "/hr/visitor-log", permission: "visitor-log.view" },
  { prefix: "/hr/reports", permission: "hr-reports.view" },
  { prefix: "/hr/meetings", permission: "meetings.view" },
  { prefix: "/hr/events", permission: "events.view" },
  { prefix: "/hr/planner", permission: "staff-task.view" }, // legacy alias
  { prefix: "/hr/jobs", permission: "job-postings.view" }, // legacy alias
  { prefix: "/hr/job-application", permission: "applications.view" }, // legacy alias

  // Student management
  { prefix: "/student-management/enrolled-students", permission: "enrolled-students.view" },
  { prefix: "/student-management/foundation-requests", permission: "foundation-requests.view" },
  { prefix: "/student-management/student-enrollments", permission: "student-enrollments.view" },
  { prefix: "/student-management/students", permission: "students.view" },
  { prefix: "/student-management/parents", permission: "parents.view" },
  { prefix: "/student-management/grades", permission: "grades.view" },
  { prefix: "/student-management/academic-terms", permission: "academic-terms.view" },

  // Transportation
  { prefix: "/transportation/routes", permission: "routes.view" },
  { prefix: "/transportation/vehicles", permission: "vehicles.view" },

  // Finance
  { prefix: "/finance/accounts", permission: "accounts.view" },
  { prefix: "/finance/chart-of-accounts", permission: "chart-of-accounts.view" },
  { prefix: "/finance/invoices", permission: "invoices.view" },
  { prefix: "/finance/fee-invoices", permission: "invoices.view" },
  { prefix: "/finance/fee-payments", permission: "fee-payments.view" },
  { prefix: "/finance/payments", permission: "payments.view" },
  { prefix: "/finance/budgets", permission: "budgets.view" },
  { prefix: "/finance/dashboard", permission: "finance.view" },
  { prefix: "/finance", permission: "finance.view" },

  // Recruitment
  { prefix: "/recruitment/job-requisitions", permission: "job-requisitions.view" },
  { prefix: "/recruitment/job-postings", permission: "job-postings.view" },
  { prefix: "/recruitment/applications", permission: "applications.view" },
  { prefix: "/recruitment/candidate-pool", permission: "candidate-pool.view" },

  // Purchase / inventory
  { prefix: "/purchase/purchase-requests", permission: "purchase-requests.view" },
  { prefix: "/purchase/suppliers", permission: "suppliers.view" },
  { prefix: "/purchase/stock", permission: "stock.view" },
  { prefix: "/purchase/routine-items", permission: "routine-items.view" },
  { prefix: "/purchase/repair-requests", permission: "repair-requests.view" },
  { prefix: "/purchase/projects", permission: "projects.view" },
];

// Sort longest-prefix first so /class-management/classes wins over /class-management.
RULES.sort((a, b) => b.prefix.length - a.prefix.length);

// Pages everyone authenticated can see (no permission required).
const PUBLIC_PATHS = new Set([
  "/",
  "/profile",
  "/403",
  "/settings",
  "/support",
  "/dashboard",
  "/payroll",
  "/leave-requests",
  "/number-puzzle",
  "/departments",
]);

/**
 * Resolve the required permission for a given pathname.
 * Returns:
 *   { type: "public" }                  → accessible to any authenticated user
 *   { type: "protected", permission }   → accessible only with this permission
 *   { type: "untagged" }                → no rule matched → super-admin only
 */
export function permissionForPath(pathname) {
  if (PUBLIC_PATHS.has(pathname)) return { type: "public" };
  for (const rule of RULES) {
    if (pathname === rule.prefix || pathname.startsWith(rule.prefix + "/")) {
      return { type: "protected", permission: rule.permission };
    }
  }
  return { type: "untagged" };
}
