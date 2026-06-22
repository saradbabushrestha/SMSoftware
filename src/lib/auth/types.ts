import type { UserRole } from "@prisma/client";
import type { PermissionKey } from "@/lib/rbac/permissions";

/** Serializable representation of the signed-in user (safe for client props). */
export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  schoolId: string | null;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  permissions: PermissionKey[];
}
