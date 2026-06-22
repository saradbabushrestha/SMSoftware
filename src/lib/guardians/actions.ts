"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { UserStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { DEMO_PASSWORD } from "@/lib/auth/demo-accounts";
import { can, requireUser } from "@/lib/rbac/authorize";
import { audit } from "@/lib/audit";
import {
  createGuardianSchema,
  updateGuardianSchema,
  linkStudentSchema,
  formToObject,
} from "@/lib/guardians/validation";

export interface GuardianFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export interface LinkFormState {
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

function guardianScope(user: SessionUserT) {
  return user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {};
}

async function resolveSchoolId(
  user: SessionUserT,
  schoolIdField: string | undefined,
): Promise<{ schoolId?: string; error?: string }> {
  if (user.role === "SUPER_ADMIN") {
    if (!schoolIdField) return { error: "Select a school for this guardian." };
    const school = await db.school.findFirst({ where: { id: schoolIdField, deletedAt: null } });
    if (!school) return { error: "The selected school no longer exists." };
    return { schoolId: school.id };
  }
  if (user.schoolId) return { schoolId: user.schoolId };
  return { error: "No school associated with your account." };
}

// ─── Guardian CRUD ───────────────────────────────────────────────────────────

export async function createGuardianAction(
  _prev: GuardianFormState,
  formData: FormData,
): Promise<GuardianFormState> {
  const user = await requireUser();
  if (!can(user, "guardian:manage")) return { error: "You don't have permission to add guardians." };

  const parsed = createGuardianSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const data = parsed.data;

  const resolved = await resolveSchoolId(user, String(formData.get("schoolId") ?? "") || undefined);
  if (resolved.error || !resolved.schoolId) return { error: resolved.error };
  const schoolId = resolved.schoolId;

  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) return { fieldErrors: { email: "An account with this email already exists." } };

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const guardian = await db.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: "PARENT",
        status: "ACTIVE",
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        schoolId,
      },
    });
    return tx.guardian.create({
      data: { schoolId, userId: createdUser.id, occupation: data.occupation, address: data.address },
    });
  });
  await audit({
    action: "guardian.create",
    userId: user.id,
    schoolId,
    entityType: "Guardian",
    entityId: guardian.id,
    metadata: { email: data.email },
  });

  revalidatePath("/dashboard/guardians");
  redirect(`/dashboard/guardians/${guardian.id}`);
}

export async function updateGuardianAction(
  _prev: GuardianFormState,
  formData: FormData,
): Promise<GuardianFormState> {
  const user = await requireUser();
  if (!can(user, "guardian:manage")) return { error: "You don't have permission to edit guardians." };

  const id = String(formData.get("id") ?? "");
  const existing = await db.guardian.findFirst({ where: { id, deletedAt: null, ...guardianScope(user) } });
  if (!existing) return { error: "Guardian not found." };

  const parsed = updateGuardianSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const data = parsed.data;

  await db.$transaction([
    db.guardian.update({ where: { id }, data: { occupation: data.occupation, address: data.address } }),
    db.user.update({
      where: { id: existing.userId },
      data: { firstName: data.firstName, lastName: data.lastName, phone: data.phone, status: data.status },
    }),
  ]);
  await audit({
    action: "guardian.update",
    userId: user.id,
    schoolId: existing.schoolId,
    entityType: "Guardian",
    entityId: id,
  });

  revalidatePath("/dashboard/guardians");
  revalidatePath(`/dashboard/guardians/${id}`);
  redirect(`/dashboard/guardians/${id}`);
}

export async function deleteGuardianAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "guardian:manage")) return;

  const id = String(formData.get("id") ?? "");
  const existing = await db.guardian.findFirst({ where: { id, deletedAt: null, ...guardianScope(user) } });
  if (!existing) return;

  const now = new Date();
  await db.$transaction([
    db.guardian.update({ where: { id }, data: { deletedAt: now } }),
    db.user.update({ where: { id: existing.userId }, data: { deletedAt: now, status: "DISABLED" } }),
  ]);
  await audit({
    action: "guardian.delete",
    userId: user.id,
    schoolId: existing.schoolId,
    entityType: "Guardian",
    entityId: id,
  });

  revalidatePath("/dashboard/guardians");
  redirect("/dashboard/guardians");
}

export async function changeGuardianStatusAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "guardian:manage")) return;

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["ACTIVE", "SUSPENDED"].includes(status)) return;

  const existing = await db.guardian.findFirst({ where: { id, deletedAt: null, ...guardianScope(user) } });
  if (!existing) return;

  await db.user.update({ where: { id: existing.userId }, data: { status: status as UserStatus } });
  await audit({
    action: "guardian.status",
    userId: user.id,
    schoolId: existing.schoolId,
    entityType: "Guardian",
    entityId: id,
    metadata: { status },
  });
  revalidatePath(`/dashboard/guardians/${id}`);
  revalidatePath("/dashboard/guardians");
}

// ─── Student links ───────────────────────────────────────────────────────────

/** Ensure a guardian is in scope; returns it or null. */
async function guardianInScope(user: SessionUserT, guardianId: string) {
  return db.guardian.findFirst({ where: { id: guardianId, deletedAt: null, ...guardianScope(user) } });
}

export async function linkStudentAction(
  _prev: LinkFormState,
  formData: FormData,
): Promise<LinkFormState> {
  const user = await requireUser();
  if (!can(user, "guardian:manage")) return { error: "You don't have permission." };

  const guardianId = String(formData.get("guardianId") ?? "");
  const guardian = await guardianInScope(user, guardianId);
  if (!guardian) return { error: "Guardian not found." };

  const parsed = linkStudentSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const { studentId, relation } = parsed.data;
  const isPrimary = formData.get("isPrimary") === "on";

  const student = await db.student.findFirst({
    where: { id: studentId, deletedAt: null, schoolId: guardian.schoolId },
  });
  if (!student) return { fieldErrors: { studentId: "Student not found in this school." } };

  await db.$transaction(async (tx) => {
    await tx.studentGuardian.upsert({
      where: { studentId_guardianId: { studentId, guardianId } },
      update: { relation, isPrimary },
      create: { studentId, guardianId, relation, isPrimary },
    });
    if (isPrimary) {
      // Enforce a single primary guardian per student.
      await tx.studentGuardian.updateMany({
        where: { studentId, guardianId: { not: guardianId }, isPrimary: true },
        data: { isPrimary: false },
      });
    }
  });
  await audit({
    action: "guardian.link",
    userId: user.id,
    schoolId: guardian.schoolId,
    entityType: "Guardian",
    entityId: guardianId,
    metadata: { studentId, relation, isPrimary },
  });

  revalidatePath(`/dashboard/guardians/${guardianId}`);
  return { ok: true };
}

export async function unlinkStudentAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "guardian:manage")) return;

  const linkId = String(formData.get("linkId") ?? "");
  const link = await db.studentGuardian.findFirst({
    where: { id: linkId, guardian: { deletedAt: null, ...guardianScope(user) } },
    include: { guardian: true },
  });
  if (!link) return;

  await db.studentGuardian.delete({ where: { id: linkId } });
  await audit({
    action: "guardian.unlink",
    userId: user.id,
    schoolId: link.guardian.schoolId,
    entityType: "Guardian",
    entityId: link.guardianId,
    metadata: { studentId: link.studentId },
  });
  revalidatePath(`/dashboard/guardians/${link.guardianId}`);
}
