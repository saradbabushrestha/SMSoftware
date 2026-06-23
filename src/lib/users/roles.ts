import type { UserRole } from "@prisma/client";

/** Roles that own a dedicated profile module — create/manage them there, not here. */
export const PROFILE_ROLES: UserRole[] = ["STUDENT", "TEACHER", "PARENT"];

/** Account-only roles that the Users module can create/assign. */
const STAFF_ROLES: UserRole[] = ["SCHOOL_ADMIN", "PRINCIPAL", "ACCOUNTANT", "LIBRARIAN"];

export function hasProfile(role: UserRole): boolean {
  return PROFILE_ROLES.includes(role);
}

/** Roles an actor may assign when creating an account here. */
export function assignableRoles(actorRole: UserRole): UserRole[] {
  // Only a super admin can mint another super admin.
  return actorRole === "SUPER_ADMIN" ? ["SUPER_ADMIN", ...STAFF_ROLES] : STAFF_ROLES;
}
