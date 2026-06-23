import type { UserRole } from "@prisma/client";

/**
 * Permission catalog — the single source of truth for RBAC.
 * Keys use the `resource:action` convention. The DB `permissions` /
 * `user_permissions` tables mirror this catalog (seeded from it) so that
 * per-user overrides can be stored, but enforcement reads this matrix for speed.
 */
export const PERMISSIONS = {
  // Dashboard / analytics
  "dashboard:view": "View dashboard",
  "analytics:view": "View analytics & BI",

  // Tenancy / platform
  "school:view": "View schools",
  "school:manage": "Create / edit / delete schools",
  "system:configure": "Configure platform settings",
  "subscription:manage": "Manage subscription plans",

  // Users & access
  "user:view": "View users",
  "user:manage": "Create / edit / disable users",
  "role:manage": "Manage roles & permissions",

  // Students
  "student:view": "View students",
  "student:create": "Admit students",
  "student:update": "Edit student records",
  "student:delete": "Remove students",
  "student:promote": "Promote / transfer / graduate students",

  // Teachers / staff
  "teacher:view": "View teachers",
  "teacher:manage": "Create / edit teachers",
  "teacher:evaluate": "Evaluate teacher performance",

  // Guardians
  "guardian:view": "View guardians",
  "guardian:manage": "Create / edit guardians",

  // Academic structure
  "class:view": "View classes & sections",
  "class:manage": "Manage classes, sections & streams",
  "subject:view": "View subjects",
  "subject:manage": "Manage subjects",
  "timetable:view": "View timetable",
  "timetable:manage": "Build & edit timetable",

  // Attendance
  "attendance:view": "View attendance",
  "attendance:mark": "Mark attendance",

  // Exams & grading
  "exam:view": "View exams",
  "exam:manage": "Schedule & manage exams",
  "grade:view": "View grades",
  "grade:manage": "Enter & manage grades",

  // Assignments / LMS
  "assignment:view": "View assignments",
  "assignment:manage": "Create & grade assignments",
  "assignment:submit": "Submit assignments",

  // Finance
  "fee:view": "View fees & invoices",
  "fee:manage": "Manage fee structures & invoices",
  "payment:make": "Make payments",
  "payment:manage": "Reconcile & manage payments",
  "payroll:view": "View payroll",
  "payroll:manage": "Run payroll",
  "accounting:view": "View accounting ledgers",
  "accounting:manage": "Manage accounting",

  // Library
  "library:view": "View library catalog",
  "library:manage": "Manage books & borrowing",

  // Transport / hostel
  "transport:view": "View transport",
  "transport:manage": "Manage transport",
  "hostel:view": "View hostel",
  "hostel:manage": "Manage hostel",

  // Events & communication
  "event:view": "View events",
  "event:manage": "Manage events",
  "message:send": "Send messages",
  "announcement:view": "View announcements",
  "announcement:manage": "Create announcements",

  // Reports & audit
  "report:view": "View reports",
  "report:approve": "Approve reports",
  "audit:view": "View audit logs",
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as PermissionKey[];

/** Sentinel meaning "every permission" (used by SUPER_ADMIN). */
const ALL = "*" as const;

/**
 * Role → permission matrix. `"*"` grants everything.
 * This expresses the access model described in the product spec.
 */
const ROLE_MATRIX: Record<UserRole, PermissionKey[] | typeof ALL> = {
  SUPER_ADMIN: ALL,

  SCHOOL_ADMIN: [
    "dashboard:view",
    "analytics:view",
    "school:view",
    "user:view",
    "user:manage",
    "student:view",
    "student:create",
    "student:update",
    "student:delete",
    "student:promote",
    "teacher:view",
    "teacher:manage",
    "teacher:evaluate",
    "guardian:view",
    "guardian:manage",
    "class:view",
    "class:manage",
    "subject:view",
    "subject:manage",
    "timetable:view",
    "timetable:manage",
    "attendance:view",
    "attendance:mark",
    "exam:view",
    "exam:manage",
    "grade:view",
    "grade:manage",
    "assignment:view",
    "fee:view",
    "fee:manage",
    "payment:manage",
    "library:view",
    "library:manage",
    "transport:view",
    "transport:manage",
    "hostel:view",
    "hostel:manage",
    "event:view",
    "event:manage",
    "message:send",
    "announcement:view",
    "announcement:manage",
    "report:view",
    "audit:view",
  ],

  PRINCIPAL: [
    "dashboard:view",
    "analytics:view",
    "school:view",
    "user:view",
    "student:view",
    "teacher:view",
    "teacher:evaluate",
    "guardian:view",
    "class:view",
    "subject:view",
    "timetable:view",
    "attendance:view",
    "exam:view",
    "grade:view",
    "assignment:view",
    "fee:view",
    "event:view",
    "event:manage",
    "message:send",
    "announcement:view",
    "announcement:manage",
    "report:view",
    "report:approve",
    "audit:view",
  ],

  TEACHER: [
    "dashboard:view",
    "student:view",
    "class:view",
    "subject:view",
    "timetable:view",
    "attendance:view",
    "attendance:mark",
    "exam:view",
    "exam:manage",
    "grade:view",
    "grade:manage",
    "assignment:view",
    "assignment:manage",
    "event:view",
    "message:send",
    "announcement:view",
    "report:view",
  ],

  STUDENT: [
    "dashboard:view",
    "class:view",
    "subject:view",
    "timetable:view",
    "attendance:view",
    "exam:view",
    "grade:view",
    "assignment:view",
    "assignment:submit",
    "fee:view",
    "library:view",
    "event:view",
    "message:send",
    "announcement:view",
  ],

  PARENT: [
    "dashboard:view",
    "student:view",
    "attendance:view",
    "exam:view",
    "grade:view",
    "timetable:view",
    "fee:view",
    "payment:make",
    "event:view",
    "message:send",
    "announcement:view",
    "report:view",
  ],

  ACCOUNTANT: [
    "dashboard:view",
    "analytics:view",
    "student:view",
    "fee:view",
    "fee:manage",
    "payment:make",
    "payment:manage",
    "payroll:view",
    "payroll:manage",
    "accounting:view",
    "accounting:manage",
    "report:view",
    "message:send",
    "announcement:view",
  ],

  LIBRARIAN: [
    "dashboard:view",
    "student:view",
    "teacher:view",
    "library:view",
    "library:manage",
    "event:view",
    "message:send",
    "announcement:view",
    "report:view",
  ],
};

/** Resolve the full permission list for a role (expands the `*` sentinel). */
export function getRolePermissions(role: UserRole): PermissionKey[] {
  const entry = ROLE_MATRIX[role];
  return entry === ALL ? [...ALL_PERMISSIONS] : entry;
}

/** Whether a role is granted a permission by default (ignores per-user overrides). */
export function roleHasPermission(role: UserRole, permission: PermissionKey): boolean {
  const entry = ROLE_MATRIX[role];
  return entry === ALL || entry.includes(permission);
}

/** Human-readable role labels for the UI. */
export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  SCHOOL_ADMIN: "School Admin",
  PRINCIPAL: "Principal",
  TEACHER: "Teacher",
  STUDENT: "Student",
  PARENT: "Parent / Guardian",
  ACCOUNTANT: "Accountant",
  LIBRARIAN: "Librarian",
};
