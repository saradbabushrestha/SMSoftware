import type { AnnouncementAudience, UserRole } from "@prisma/client";

export const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  ALL: "Everyone",
  STAFF: "Staff",
  STUDENTS: "Students",
  PARENTS: "Parents",
};

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "info" | "outline";

export const AUDIENCE_VARIANT: Record<AnnouncementAudience, BadgeVariant> = {
  ALL: "secondary",
  STAFF: "info",
  STUDENTS: "success",
  PARENTS: "warning",
};

export const AUDIENCE_OPTIONS: { value: AnnouncementAudience; label: string }[] = [
  { value: "ALL", label: "Everyone" },
  { value: "STAFF", label: "Staff only" },
  { value: "STUDENTS", label: "Students" },
  { value: "PARENTS", label: "Parents" },
];

/** Which audience bucket a role falls into (for filtering what a viewer sees). */
export function audienceForRole(role: UserRole): AnnouncementAudience {
  if (role === "STUDENT") return "STUDENTS";
  if (role === "PARENT") return "PARENTS";
  // Admins, principals, teachers, accountants, librarians are "staff".
  return "STAFF";
}

export function fmtDateTime(d: Date): string {
  return d.toLocaleString("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" });
}

export function fmtDate(d: Date): string {
  return d.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** "YYYY-MM-DDTHH:mm" for a datetime-local input. */
export function dateTimeInputValue(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

export function isExpired(expiresAt: Date | null, now: Date): boolean {
  return !!expiresAt && expiresAt.getTime() < now.getTime();
}
