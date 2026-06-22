"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, type UserStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { DEMO_PASSWORD } from "@/lib/auth/demo-accounts";
import { can, requireUser } from "@/lib/rbac/authorize";
import { audit } from "@/lib/audit";
import { createTeacherSchema, updateTeacherSchema, formToObject } from "@/lib/teachers/validation";
import { nextEmployeeId } from "@/lib/teachers/queries";

export interface TeacherFormState {
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

/** Subjects the user selected that actually belong to the target school. */
async function validSubjectIds(schoolId: string, formData: FormData): Promise<string[]> {
  const requested = formData.getAll("subjectIds").map(String).filter(Boolean);
  if (requested.length === 0) return [];
  const found = await db.subject.findMany({
    where: { id: { in: requested }, schoolId, deletedAt: null },
    select: { id: true },
  });
  return found.map((s) => s.id);
}

async function resolveSchoolId(
  user: Awaited<ReturnType<typeof requireUser>>,
  schoolIdField: string | undefined,
): Promise<{ schoolId?: string; error?: string }> {
  if (user.role === "SUPER_ADMIN") {
    if (!schoolIdField) return { error: "Select a school for this teacher." };
    const school = await db.school.findFirst({ where: { id: schoolIdField, deletedAt: null } });
    if (!school) return { error: "The selected school no longer exists." };
    return { schoolId: school.id };
  }
  if (user.schoolId) return { schoolId: user.schoolId };
  return { error: "No school associated with your account." };
}

export async function createTeacherAction(
  _prev: TeacherFormState,
  formData: FormData,
): Promise<TeacherFormState> {
  const user = await requireUser();
  if (!can(user, "teacher:manage")) return { error: "You don't have permission to add teachers." };

  const parsed = createTeacherSchema.safeParse(formToObject(formData, ["subjectIds"]));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const data = parsed.data;

  const resolved = await resolveSchoolId(user, data.schoolId);
  if (resolved.error || !resolved.schoolId) return { error: resolved.error };
  const schoolId = resolved.schoolId;

  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) return { fieldErrors: { email: "An account with this email already exists." } };

  const employeeId = data.employeeId || (await nextEmployeeId(schoolId));
  const subjectIds = await validSubjectIds(schoolId, formData);
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  let newId: string;
  try {
    const teacher = await db.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          role: "TEACHER",
          status: "ACTIVE",
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          schoolId,
        },
      });
      return tx.teacher.create({
        data: {
          schoolId,
          userId: createdUser.id,
          employeeId,
          qualification: data.qualification,
          experienceYrs: data.experienceYrs ?? 0,
          joinedOn: data.joinedOn,
          subjects: subjectIds.length ? { connect: subjectIds.map((id) => ({ id })) } : undefined,
        },
      });
    });
    newId = teacher.id;
    await audit({
      action: "teacher.create",
      userId: user.id,
      schoolId,
      entityType: "Teacher",
      entityId: teacher.id,
      metadata: { employeeId, email: data.email },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "That employee ID is already in use." };
    }
    throw e;
  }

  revalidatePath("/dashboard/teachers");
  redirect(`/dashboard/teachers/${newId}`);
}

export async function updateTeacherAction(
  _prev: TeacherFormState,
  formData: FormData,
): Promise<TeacherFormState> {
  const user = await requireUser();
  if (!can(user, "teacher:manage")) return { error: "You don't have permission to edit teachers." };

  const id = String(formData.get("id") ?? "");
  const existing = await db.teacher.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {}),
    },
  });
  if (!existing) return { error: "Teacher not found." };

  const parsed = updateTeacherSchema.safeParse(formToObject(formData, ["subjectIds"]));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const data = parsed.data;
  const subjectIds = await validSubjectIds(existing.schoolId, formData);

  try {
    await db.$transaction(async (tx) => {
      await tx.teacher.update({
        where: { id },
        data: {
          qualification: data.qualification,
          experienceYrs: data.experienceYrs ?? existing.experienceYrs,
          joinedOn: data.joinedOn,
          employeeId: data.employeeId || existing.employeeId,
          subjects: { set: subjectIds.map((sid) => ({ id: sid })) },
        },
      });
      await tx.user.update({
        where: { id: existing.userId },
        data: { firstName: data.firstName, lastName: data.lastName, phone: data.phone, status: data.status },
      });
    });
    await audit({
      action: "teacher.update",
      userId: user.id,
      schoolId: existing.schoolId,
      entityType: "Teacher",
      entityId: id,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "That employee ID is already in use." };
    }
    throw e;
  }

  revalidatePath("/dashboard/teachers");
  revalidatePath(`/dashboard/teachers/${id}`);
  redirect(`/dashboard/teachers/${id}`);
}

export async function deleteTeacherAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "teacher:manage")) return;

  const id = String(formData.get("id") ?? "");
  const existing = await db.teacher.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {}),
    },
  });
  if (!existing) return;

  const now = new Date();
  await db.$transaction([
    db.teacher.update({ where: { id }, data: { deletedAt: now } }),
    db.user.update({ where: { id: existing.userId }, data: { deletedAt: now, status: "DISABLED" } }),
  ]);
  await audit({
    action: "teacher.delete",
    userId: user.id,
    schoolId: existing.schoolId,
    entityType: "Teacher",
    entityId: id,
  });

  revalidatePath("/dashboard/teachers");
  redirect("/dashboard/teachers");
}

export async function changeTeacherStatusAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "teacher:manage")) return;

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["ACTIVE", "SUSPENDED"].includes(status)) return;

  const existing = await db.teacher.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {}),
    },
  });
  if (!existing) return;

  await db.user.update({ where: { id: existing.userId }, data: { status: status as UserStatus } });
  await audit({
    action: "teacher.status",
    userId: user.id,
    schoolId: existing.schoolId,
    entityType: "Teacher",
    entityId: id,
    metadata: { status },
  });

  revalidatePath("/dashboard/teachers");
  revalidatePath(`/dashboard/teachers/${id}`);
}
