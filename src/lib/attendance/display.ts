import type { AttendanceStatus } from "@prisma/client";

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  LEAVE: "Leave",
};

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "info" | "outline";

export const ATTENDANCE_STATUS_VARIANT: Record<AttendanceStatus, BadgeVariant> = {
  PRESENT: "success",
  ABSENT: "destructive",
  LATE: "warning",
  LEAVE: "info",
};

export const ATTENDANCE_OPTIONS: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "LEAVE"];

/** Parse a yyyy-mm-dd string into a UTC-midnight Date (stable for @db.Date keys). */
export function parseDateParam(value: string | undefined): Date {
  const today = new Date();
  const fallback = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const str = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
  return new Date(`${str}T00:00:00.000Z`);
}

/** Format a Date as yyyy-mm-dd (UTC). */
export function toDateParam(d: Date): string {
  return d.toISOString().slice(0, 10);
}
