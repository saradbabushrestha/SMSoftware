"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { UserStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { DEMO_PASSWORD } from "@/lib/auth/demo-accounts";
import { can, requireUser } from "@/lib/rbac/authorize";
import { audit } from "@/lib/audit";
import { createUserSchema, updateUserSchema, formToObject } from "@/lib/users/validation";
import { assignableRoles, hasProfile } from "@/lib/users/roles";

export interface UserFormState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

function zodToFieldErrors(error: import("zod").ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

type SessionUserT = Awaited<ReturnType<typeof requireUser>>;

function userScope(user: SessionUserT) {
  return user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {};
}

export async function createUserAction(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const actor = await requireUser();
  if (!can(actor, "user:manage")) return { error: "You don't have permission to manage users." };

  const parsed = createUserSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const data = parsed.data;

  if (!assignableRoles(actor.role).includes(data.role)) {
    return { fieldErrors: { role: "You can't assign that role." } };
  }

  // Resolve school: super admins are platform-level; others are school-scoped.
  let schoolId: string | null;
  if (data.role === "SUPER_ADMIN") {
    schoolId = null;
  } else if (actor.role === "SUPER_ADMIN") {
    const sid = String(formData.get("schoolId") ?? "");
    const school = sid ? await db.school.findFirst({ where: { id: sid, deletedAt: null } }) : null;
    if (!school) return { fieldErrors: { schoolId: "Select a school." } };
    schoolId = school.id;
  } else {
    schoolId = actor.schoolId;
  }

  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) return { fieldErrors: { email: "An account with this email already exists." } };

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const created = await db.user.create({
    data: { email: data.email, passwordHash, role: data.role, status: "ACTIVE", firstName: data.firstName, lastName: data.lastName, phone: data.phone, schoolId },
  });
  await audit({ action: "user.create", userId: actor.id, schoolId, entityType: "User", entityId: created.id, metadata: { role: data.role, email: data.email } });

  revalidatePath("/dashboard/users");
  redirect(`/dashboard/users/${created.id}`);
}

export async function updateUserAction(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const actor = await requireUser();
  if (!can(actor, "user:manage")) return { error: "You don't have permission to manage users." };

  const id = String(formData.get("id") ?? "");
  const target = await db.user.findFirst({ where: { id, deletedAt: null, ...userScope(actor) } });
  if (!target) return { error: "User not found." };

  const parsed = updateUserSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const data = parsed.data;

  // Can't lock yourself out.
  if (target.id === actor.id && data.status !== "ACTIVE") {
    return { fieldErrors: { status: "You can't change your own status." } };
  }

  // Role changes require role:manage, a non-profile target, and an assignable role.
  let role = target.role;
  let schoolId = target.schoolId;
  if (data.role && data.role !== target.role) {
    if (!can(actor, "role:manage")) return { fieldErrors: { role: "Only a super admin can change roles." } };
    if (hasProfile(target.role) || hasProfile(data.role)) return { fieldErrors: { role: "Manage student/teacher/guardian roles in their own module." } };
    if (!assignableRoles(actor.role).includes(data.role)) return { fieldErrors: { role: "You can't assign that role." } };
    if (target.id === actor.id) return { fieldErrors: { role: "You can't change your own role." } };
    role = data.role;
    if (role === "SUPER_ADMIN") schoolId = null;
  }

  await db.user.update({
    where: { id },
    data: { firstName: data.firstName, lastName: data.lastName, phone: data.phone, status: data.status, role, schoolId },
  });
  await audit({ action: "user.update", userId: actor.id, schoolId: target.schoolId, entityType: "User", entityId: id });

  revalidatePath("/dashboard/users");
  revalidatePath(`/dashboard/users/${id}`);
  redirect(`/dashboard/users/${id}`);
}

export async function resetPasswordAction(formData: FormData): Promise<void> {
  const actor = await requireUser();
  if (!can(actor, "user:manage")) return;

  const id = String(formData.get("id") ?? "");
  const target = await db.user.findFirst({ where: { id, deletedAt: null, ...userScope(actor) } });
  if (!target) return;

  await db.user.update({ where: { id }, data: { passwordHash: await hashPassword(DEMO_PASSWORD) } });
  // Revoke active sessions so the temporary password takes effect everywhere.
  await db.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  await audit({ action: "user.reset_password", userId: actor.id, schoolId: target.schoolId, entityType: "User", entityId: id });

  revalidatePath(`/dashboard/users/${id}`);
}

export async function changeUserStatusAction(formData: FormData): Promise<void> {
  const actor = await requireUser();
  if (!can(actor, "user:manage")) return;

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["ACTIVE", "SUSPENDED"].includes(status)) return;

  const target = await db.user.findFirst({ where: { id, deletedAt: null, ...userScope(actor) } });
  if (!target || target.id === actor.id) return; // never change your own status

  await db.user.update({ where: { id }, data: { status: status as UserStatus } });
  await audit({ action: "user.status", userId: actor.id, schoolId: target.schoolId, entityType: "User", entityId: id, metadata: { status } });

  revalidatePath("/dashboard/users");
  revalidatePath(`/dashboard/users/${id}`);
}

export async function deleteUserAction(formData: FormData): Promise<void> {
  const actor = await requireUser();
  if (!can(actor, "user:manage")) return;

  const id = String(formData.get("id") ?? "");
  const target = await db.user.findFirst({ where: { id, deletedAt: null, ...userScope(actor) } });
  if (!target || target.id === actor.id) return; // never delete yourself
  if (hasProfile(target.role)) return; // manage these via their own module

  const now = new Date();
  await db.$transaction([
    db.user.update({ where: { id }, data: { deletedAt: now, status: "DISABLED" } }),
    db.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: now } }),
  ]);
  await audit({ action: "user.delete", userId: actor.id, schoolId: target.schoolId, entityType: "User", entityId: id });

  revalidatePath("/dashboard/users");
  redirect("/dashboard/users");
}
