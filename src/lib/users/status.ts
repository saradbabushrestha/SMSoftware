import type { UserStatus } from "@prisma/client";

/** Shared display helpers for the account-level user status (used by staff/guardian modules). */
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

/** Statuses an admin can toggle a user account between from the UI. */
export const USER_STATUS_ACTIONS: UserStatus[] = ["ACTIVE", "SUSPENDED"];
