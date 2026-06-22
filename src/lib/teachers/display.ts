import type { UserStatus } from "@prisma/client";

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: "Active",
  INVITED: "Invited",
  SUSPENDED: "Suspended",
  DISABLED: "Disabled",
};

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "info" | "outline";

export const USER_STATUS_VARIANT: Record<UserStatus, BadgeVariant> = {
  ACTIVE: "success",
  INVITED: "info",
  SUSPENDED: "warning",
  DISABLED: "secondary",
};

/** Statuses an admin can toggle a teacher between from the UI. */
export const TEACHER_STATUS_ACTIONS: UserStatus[] = ["ACTIVE", "SUSPENDED"];

export function fullName(first: string, last: string) {
  return `${first} ${last}`.trim();
}

export function experienceLabel(years: number) {
  if (years <= 0) return "New";
  return `${years} yr${years === 1 ? "" : "s"}`;
}
