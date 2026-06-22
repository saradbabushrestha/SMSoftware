import type { UserRole } from "@prisma/client";

/**
 * Demo accounts seeded into the database. Shared between the seed script and
 * the login screen so the credentials never drift apart.
 */
export const DEMO_PASSWORD = "Password123!";

export interface DemoAccount {
  email: string;
  role: UserRole;
  label: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { email: "superadmin@scholaris.app", role: "SUPER_ADMIN", label: "Super Admin" },
  { email: "admin@greenwood.edu", role: "SCHOOL_ADMIN", label: "School Admin" },
  { email: "principal@greenwood.edu", role: "PRINCIPAL", label: "Principal" },
  { email: "teacher@greenwood.edu", role: "TEACHER", label: "Teacher" },
  { email: "student@greenwood.edu", role: "STUDENT", label: "Student" },
  { email: "parent@greenwood.edu", role: "PARENT", label: "Parent" },
  { email: "accountant@greenwood.edu", role: "ACCOUNTANT", label: "Accountant" },
  { email: "librarian@greenwood.edu", role: "LIBRARIAN", label: "Librarian" },
];
