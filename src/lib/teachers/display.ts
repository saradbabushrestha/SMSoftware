import { USER_STATUS_ACTIONS } from "@/lib/users/status";

export { USER_STATUS_LABELS, USER_STATUS_VARIANT } from "@/lib/users/status";

/** Statuses an admin can toggle a teacher between from the UI. */
export const TEACHER_STATUS_ACTIONS = USER_STATUS_ACTIONS;

export function fullName(first: string, last: string) {
  return `${first} ${last}`.trim();
}

export function experienceLabel(years: number) {
  if (years <= 0) return "New";
  return `${years} yr${years === 1 ? "" : "s"}`;
}
