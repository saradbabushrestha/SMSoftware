import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/auth/types";
import type { PermissionKey } from "@/lib/rbac/permissions";

/** Whether a session user holds a given permission. */
export function can(user: SessionUser | null, permission: PermissionKey): boolean {
  return !!user && user.permissions.includes(permission);
}

/** Require an authenticated user or redirect to login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Require a specific permission or redirect (to login or the no-access page). */
export async function requirePermission(permission: PermissionKey): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user, permission)) redirect("/dashboard?denied=1");
  return user;
}
