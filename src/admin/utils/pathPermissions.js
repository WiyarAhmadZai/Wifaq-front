/**
 * Map URL paths → permission name. Order matters: longer/more-specific prefixes first.
 * If a path doesn't match any rule, it's considered an "untagged" page —
 * accessible only to super-admin (defense in depth, matches the sidebar default).
 *
 * Always-allowed paths (login, 403, dashboard, profile, etc.) are listed under PUBLIC_PATHS.
 */

const RULES = [
  // System / personal preferences (auto sign-out timer, etc.)
  { prefix: "/settings", permission: "settings.view" },

  // Admin / access control
  { prefix: "/admin/roles", permission: "roles.view" },
  { prefix: "/admin/permissions", permission: "permissions.view" },
  { prefix: "/admin/users", permission: "users.view" },
  { prefix: "/admin/activity-logs", permission: "activity-logs.view" },

  // Branches
  { prefix: "/branches", permission: "branches.view" },

  // Bugs & Errors — reporting available to every user (bugs.view granted to all roles)
  { prefix: "/bugs", permission: "bugs.view" },

  // DOB — birthdays for students / teachers / staff
  { prefix: "/dob/students", permission: "birthdays.student.view" },
  { prefix: "/dob/teachers", permission: "birthdays.teacher.view" },
  { prefix: "/dob/staff", permission: "birthdays.staff.view" },
  { prefix: "/dob", permission: "birthdays.view" },

  // Planning — Annual / Monthly / Weekly plans (top-level "Planning" menu).
  { prefix: "/planning", permission: "planning.view" },

  // Morning Assembly Program — its own light module (calendar → plan → agenda
  // → run sheet → archive).
  { prefix: "/assembly", permission: "assemblies.view" },

  // The 100 Essential Books. The RULES loop appends the action for /create,
  // /edit/:id and /show/:id on its own, so this one prefix covers the module.
  { prefix: "/library/essential-books", permission: "essential-books.view" },

  // Broadcast management. READING a broadcast needs no permission — it
  // arrives in a modal, not on a page — so only these screens are gated.
  { prefix: "/broadcasts", permission: "broadcasts.view" },

  // Parent Communication — the log of every contact with a family. One
  // umbrella rule: the loop derives the action from the tail on its own
  // (/create → create, /edit/:id → update, /show/:id and /history/:id → view).
  //
  // The follow-up board and the report screen need MORE than `.view`, and this
  // table cannot express that: withAction() rewrites the trailing segment, so
  // a rule naming `parent-communications.follow-up` on a listing path would be
  // rewritten straight back to `.view`. Those two screens therefore check their
  // own permission on mount and bounce to /403, and the backend gates their
  // endpoints on `.follow-up` / `.report` regardless of either.
  { prefix: "/parent-communications", permission: "parent-communications.view" },

  // Parent engagement ratings. Both screens are read-only listings; rating
  // happens through a modal whose button checks `parent-ratings.rate` itself,
  // and the backend gates the endpoint on the same permission.
  { prefix: "/parent-ratings", permission: "parent-ratings.view" },

  // Combined Meetings & Events timeline. Longest-prefix sorting keeps this
  // ahead of the shorter /hr/meetings rule. Gated on meetings.view; the page
  // asks each module separately and omits the half the caller may not see.
  { prefix: "/hr/meetings-events", permission: "meetings.view" },

  // Weekly parent questionnaires (admin). One umbrella rule: the action is
  // derived from the tail — /create → create, /edit/:id → update,
  // /:id and /:id/responses → view — with questionnaires.manage as override.
  { prefix: "/questionnaires", permission: "questionnaires.view" },

  // Recruitment — position titles
  { prefix: "/recruitment/position-titles", permission: "position-titles.view" },

  // Teacher management
  { prefix: "/teacher-management/teachers", permission: "teachers.view" },

  // Class management
  { prefix: "/class-management/classes", permission: "classes.view" },
  { prefix: "/class-management/subjects", permission: "subjects.view" },
  { prefix: "/class-management/grade-subjects", permission: "grade-subjects.view" },
  { prefix: "/class-management/schedule", permission: "schedule.view" },
  { prefix: "/class-management/exams", permission: "classes.view" }, // legacy — share classes perm

  // Education & Formation — student observation
  { prefix: "/education/4d-self-rating", permission: "student-profiles.view" },
  { prefix: "/education/dashboard", permission: "student-observations.view" },
  { prefix: "/education/observations", permission: "student-observations.view" },
  { prefix: "/education/monitoring", permission: "student-monitoring.view" },
  { prefix: "/education/elicitation", permission: "student-elicitation.view" },
  { prefix: "/education/synthesis", permission: "student-synthesis.view" },
  { prefix: "/education/annual-review", permission: "annual-review.view" },
  // Student development cards — card-rankings must come before the /cards + the
  // umbrella /education rule (longest-prefix sort handles it either way).
  { prefix: "/education/card-rankings", permission: "student-card-rankings.view" },
  { prefix: "/education/cards", permission: "student-cards.view" },
  // Weekly Recognition — Best Performer of the Week. Lives inside Student
  // Development; every teacher who may nominate also holds .view.
  { prefix: "/education/weekly-recognition", permission: "weekly-recognition.view" },
  // Lesson planning — one umbrella: list/review/analytics/templates need
  // lesson-plans.view (reviewers/analysts also hold it); /create → .create,
  // /edit → .update via action-swap. Backend additionally enforces
  // lesson-plans.review / .analyze on those endpoints.
  { prefix: "/education/lesson-plans", permission: "lesson-plans.view" },
  // Gradebook has its own permission family. Without this it fell through to
  // the catch-all /education rule and demanded student-observations.view, so a
  // teacher holding gradebook.view was bounced to /403.
  { prefix: "/education/gradebook", permission: "gradebook.view" },
  { prefix: "/education", permission: "student-observations.view" },

  // HR
  { prefix: "/hr/salary-snapshot", permission: "salary-snapshot.view" },
  { prefix: "/hr/staff-logs", permission: "staff-logs.view" },
  { prefix: "/hr/staff-task", permission: "staff-task.view" },
  { prefix: "/hr/daily-works", permission: "daily-works.view" },
  { prefix: "/hr/staff", permission: "staff.view" },
  { prefix: "/hr/departments", permission: "departments.view" },
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

  // HR — VATS (performance / evidence engine)
  { prefix: "/hr/vats/observations", permission: "vats-observations.view" },
  { prefix: "/hr/vats/slips", permission: "vats-slips.view" },
  { prefix: "/hr/vats/cards", permission: "vats-cards.view" },
  { prefix: "/hr/vats/interventions", permission: "vats-interventions.view" },
  { prefix: "/hr/vats", permission: "vats-dashboard.view" }, // overview — must come AFTER the sub-routes

  // HR — Ihsan Welfare
  { prefix: "/hr/welfare/checkin", permission: "welfare-checkin.view" },
  { prefix: "/hr/welfare/alerts", permission: "welfare-alerts.view" },
  { prefix: "/hr/welfare/benefits", permission: "welfare-benefits.view" },
  { prefix: "/hr/welfare", permission: "welfare-dashboard.view" }, // dashboard root

  // HR — Foundation
  { prefix: "/hr/holidays", permission: "holidays.view" },

  // Student management
  // Report first: longest prefix wins, and it needs the stricter grant.
  { prefix: "/student-management/attendance/report", permission: "student-attendance.report" },
  { prefix: "/student-management/attendance", permission: "student-attendance.view" },
  { prefix: "/student-management/enrolled-students", permission: "enrolled-students.view" },
  { prefix: "/student-management/foundation-requests", permission: "foundation-requests.view" },
  { prefix: "/student-management/student-enrollments", permission: "student-enrollments.view" },
  { prefix: "/student-management/students/profile", permission: "student-profiles.view" },
  // The Enrolled Students row "view" button opens the shared student detail
  // page, which otherwise demands students.view — a permission an
  // enrolled-students-only user does not hold, so the eye bounced them to
  // /403. Longest prefix wins, so this beats the /students rule below.
  { prefix: "/student-management/students/show", permission: "students.view", alt: ["enrolled-students.view"] },
  { prefix: "/student-management/students", permission: "students.view" },
  { prefix: "/student-management/parents", permission: "parents.view" },
  { prefix: "/student-management/grades", permission: "grades.view" },
  { prefix: "/student-management/academic-terms", permission: "academic-terms.view" },

  // Transportation
  { prefix: "/transportation/routes", permission: "routes.view" },
  { prefix: "/transportation/vehicles", permission: "vehicles.view" },

  // Finance — mirrors PathPermissionMiddleware. Longest-prefix-first sort
  // (below) makes the specific keys win over the /finance umbrella.
  { prefix: "/finance/accounts", permission: "accounts.view" },
  { prefix: "/finance/chart-of-accounts", permission: "chart-of-accounts.view" },
  { prefix: "/finance/parties", permission: "parties.view" },
  { prefix: "/finance/journal-entries", permission: "journal-entries.view" },
  { prefix: "/finance/payroll", permission: "payroll.view" },
  { prefix: "/finance/invoices", permission: "invoices.view" },
  { prefix: "/finance/fee-invoices", permission: "fee-invoices.view" },
  { prefix: "/finance/billing-runs", permission: "fee-invoices.view" },
  { prefix: "/finance/fee-payments", permission: "fee-payments.view" },
  { prefix: "/finance/payments", permission: "payments.view" },
  { prefix: "/finance/budgets", permission: "budgets.view" },
  { prefix: "/finance/inbox", permission: "finance-inbox.view" },
  { prefix: "/finance/cashier", permission: "fee-payments.view" },
  // Board-pack reports — Balance Sheet, Monthly P&L + PDF download
  { prefix: "/finance/balance-sheet", permission: "finance-reports.view" },
  { prefix: "/finance/monthly-report", permission: "finance-reports.view" },
  // Plain-English wizard for asset + liability bookkeeping
  { prefix: "/finance/quick-entry", permission: "journal-entries.create" },
  { prefix: "/finance/reports", permission: "finance.view" },
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

  // Neither had a rule, so permissionForPath() returned "untagged" and the
  // guard allowed super-admins only — even though the sidebar showed the link
  // to anyone holding the matching permission. (/my-questionnaire needs no rule
  // here: it is already in PUBLIC_PATHS below.)
  { prefix: "/drive", permission: "drive.view" },
  { prefix: "/admin/trash", permission: "trash.view" },
];

// Sort longest-prefix first so /class-management/classes wins over /class-management.
RULES.sort((a, b) => b.prefix.length - a.prefix.length);

// Pages everyone authenticated can see (no permission required).
const PUBLIC_PATHS = new Set([
  "/",
  "/profile",
  "/403",
  "/support",
  "/dashboard",
  "/payroll",
  "/leave-requests",
  "/number-puzzle",
  "/departments",
  // Welfare alerts & benefits: any authenticated staff may open these to
  // see THEIR OWN records (notification target). The backend row-scopes
  // the data — privileged welfare roles see all, staff see only their own.
  "/hr/welfare/alerts",
  "/hr/welfare/benefits",
  // Staff Tasks list: any authenticated user may open it to see THEIR OWN
  // tasks + collaboration offered to them. Backend scopes the data; the
  // create/edit sub-pages stay permission-gated via the RULES prefix.
  "/hr/staff-task",
  // Parties list — any authenticated staff may open it to see THEIR OWN
  // staff Party (self-service balance / advance history). Backend scopes
  // the response; privileged users with parties.view see the full list.
  "/finance/parties",
  // Personal notifications inbox — every authenticated user sees their own
  // feed (backend's /api/notifications already scopes the response to the
  // logged-in user). No permission needed.
  "/notifications",
  // Parent's own questionnaire answering page — backend route is
  // withoutMiddleware('path.permission') and row-scopes to the caller, so any
  // authenticated user may open it. The sidebar link is gated by
  // questionnaires.answer so only parents actually see it.
  "/my-questionnaire",
  // Parent portal — a parent's own children's homework + grades. Backend
  // (/api/parent/gradebook/*) is withoutMiddleware('path.permission') and
  // verifies Family.user_id ownership, so any authenticated user may open the
  // page; it just shows their own children. The sidebar link is gated by the
  // parent role so only parents see it.
  "/my-children",
  // Parent portal — a parent's own children's attendance, and the target of
  // the absence notification. The backend route is
  // withoutMiddleware('path.permission') and resolves the caller's family, so
  // any authenticated user may open the page and simply sees their own
  // children. The sidebar link is gated to the parent role.
  "/student-management/attendance/my-children",
  // Student / parent portal — the caller's OWN assembly responsibilities, and
  // the target of the assembly-role notification. The backend resolves the
  // caller's students and 403s anyone with none, so any authenticated user may
  // open the page and simply sees their own part. The sidebar link is gated to
  // the student and parent roles. Must sit here rather than under the
  // /assembly RULES prefix, which demands assemblies.view — a permission no
  // student holds, and the whole point is that they never plan, only read.
  "/assembly/my-responsibilities",
]);

/**
 * Patterns where ANY authenticated user may visit — backend row-scopes the
 * data. Use these for "show my own X" detail pages where the id varies.
 * Sub-pages like /create, /edit/:id stay permission-gated via RULES.
 */
const SELF_SCOPED_PATH_PATTERNS = [
  // Party ledger detail — the staff member's own party ledger
  /^\/finance\/parties\/\d+\/ledger$/,
  // Meetings list + show — backend row-scopes to organizer + participants
  // so any authenticated user can land on their invite from a notification.
  /^\/hr\/meetings$/,
  /^\/hr\/meetings\/show\/\d+$/,
  // Events list + show — same row-scoping pattern as meetings: creator,
  // main-responsible, role assignees, requirement assignees can read.
  // /create + /edit/:id stay permission-gated via the RULES table.
  /^\/hr\/events$/,
  /^\/hr\/events\/show\/\d+$/,
  // Contracts list + show — staff member can read their own contract row.
  // Backend row-scopes the response so privacy is preserved.
  /^\/hr\/contracts$/,
  /^\/hr\/contracts\/show\/\d+$/,
  // VATS cards — any staff member can land here from a yellow-card
  // notification; the backend row-scopes to their own cards (HR sees all).
  /^\/hr\/vats\/cards$/,
];

/**
 * Derive the action suffix from a sub-path tail.
 *  - "/create"          → "create"
 *  - "/edit/:id"        → "update"
 *  - "/show/:id"        → "view"
 *  - "" or "/" or list  → "view"
 *  - anything else      → "view"  (read-like default)
 */
function actionForTail(tail) {
  if (!tail || tail === "/") return "view";
  if (tail === "/create" || tail.startsWith("/create/")) return "create";
  if (tail.startsWith("/edit/") || tail.startsWith("/edit")) return "update";
  if (tail.startsWith("/show/") || tail.startsWith("/show")) return "view";
  return "view";
}

/**
 * Replace the trailing ".{action}" of a permission key with a different action.
 * For modules that only have ".view" seeded, the caller should still try
 * ".manage" as a fallback (handled by the gate).
 */
function withAction(permission, action) {
  if (!permission.includes(".")) return `${permission}.${action}`;
  return permission.replace(/\.[^.]+$/, `.${action}`);
}

/**
 * Resolve the required permission(s) for a given pathname.
 * Returns:
 *   { type: "public" }                                      → accessible to any authenticated user
 *   { type: "protected", permissions: string[] }            → user needs ANY of these
 *   { type: "untagged" }                                    → no rule matched → super-admin only
 *
 * "permissions" is a list because we want OR semantics: e.g. on a /create
 * sub-path we accept either "{module}.create" or "{module}.manage".
 */
export function permissionForPath(pathname) {
  if (PUBLIC_PATHS.has(pathname)) return { type: "public" };
  for (const re of SELF_SCOPED_PATH_PATTERNS) {
    if (re.test(pathname)) return { type: "public" };
  }
  for (const rule of RULES) {
    if (pathname === rule.prefix || pathname.startsWith(rule.prefix + "/")) {
      const tail = pathname.slice(rule.prefix.length); // "" | "/create" | "/edit/123" | "/show/123"
      const action = actionForTail(tail);
      const base = withAction(rule.permission, action);
      const manage = withAction(rule.permission, "manage");
      // For pure listing, .view alone is fine; .manage is a global override.
      const candidates = action === "view" ? [base, manage] : [base, manage];
      // Alternate modules that also unlock this path (OR semantics). Each entry
      // is a full permission key whose action suffix is swapped the same way.
      for (const altPermission of rule.alt || []) {
        candidates.push(withAction(altPermission, action), withAction(altPermission, "manage"));
      }
      return { type: "protected", permissions: candidates };
    }
  }
  return { type: "untagged" };
}
