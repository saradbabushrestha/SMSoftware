import type { ReportStatus } from "@prisma/client";

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  SUBMITTED: "Pending review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "info" | "outline";

export const REPORT_STATUS_VARIANT: Record<ReportStatus, BadgeVariant> = {
  SUBMITTED: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
};

export const REPORT_CATEGORIES = ["Academic", "Attendance", "Finance", "Discipline", "Examination", "Other"];

export function fmtDate(d: Date | null): string {
  return d ? d.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "—";
}

export function fmtDateTime(d: Date): string {
  return d.toLocaleString("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
}
