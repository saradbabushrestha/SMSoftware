import type { PermissionKey } from "@/lib/rbac/permissions";

export interface ReportDef {
  key: string;
  label: string;
  description: string;
  permission: PermissionKey; // additional data permission required
}

/** The catalogue of exportable reports. Each is gated by its data permission. */
export const REPORTS: ReportDef[] = [
  { key: "students", label: "Students", description: "Roster with class, status and contact.", permission: "student:view" },
  { key: "teachers", label: "Teachers", description: "Staff directory with subjects and experience.", permission: "teacher:view" },
  { key: "attendance", label: "Attendance summary", description: "Per-student attendance counts and percentage.", permission: "attendance:view" },
  { key: "invoices", label: "Fees & invoices", description: "Invoices with amount, paid and balance.", permission: "fee:view" },
  { key: "payments", label: "Payments", description: "Recorded payments and gateways.", permission: "fee:view" },
  { key: "grades", label: "Exam results", description: "Per-student exam marks and grades.", permission: "grade:view" },
];

export function getReport(key: string): ReportDef | undefined {
  return REPORTS.find((r) => r.key === key);
}
