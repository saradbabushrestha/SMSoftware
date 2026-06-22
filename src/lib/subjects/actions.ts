"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/rbac/authorize";
import { audit } from "@/lib/audit";
import { subjectSchema, formToObject } from "@/lib/subjects/validation";

export interface SubjectFormState {
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

function schoolScope(user: SessionUserT) {
  return user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {};
}

/** Teacher ids that actually belong to the target school. */
async function validTeacherIds(schoolId: string, formData: FormData): Promise<string[]> {
  const requested = formData.getAll("teacherIds").map(String).filter(Boolean);
  if (requested.length === 0) return [];
  const found = await db.teacher.findMany({
    where: { id: { in: requested }, schoolId, deletedAt: null },
    select: { id: true },
  });
  return found.map((t) => t.id);
}

/** Resolve school (+ validate class) from the chosen class or an explicit school. */
async function resolveTarget(
  user: SessionUserT,
  classId: string | undefined,
  schoolIdField: string | undefined,
): Promise<{ schoolId?: string; classId?: string | null; error?: string }> {
  if (classId) {
    const klass = await db.schoolClass.findFirst({
      where: { id: classId, deletedAt: null, ...schoolScope(user) },
    });
    if (!klass) return { error: "The selected class no longer exists." };
    return { schoolId: klass.schoolId, classId: klass.id };
  }
  if (user.role === "SUPER_ADMIN") {
    if (!schoolIdField) return { error: "Select a class or school for this subject." };
    const school = await db.school.findFirst({ where: { id: schoolIdField, deletedAt: null } });
    if (!school) return { error: "The selected school no longer exists." };
    return { schoolId: school.id, classId: null };
  }
  if (user.schoolId) return { schoolId: user.schoolId, classId: null };
  return { error: "No school associated with your account." };
}

export async function createSubjectAction(
  _prev: SubjectFormState,
  formData: FormData,
): Promise<SubjectFormState> {
  const user = await requireUser();
  if (!can(user, "subject:manage")) return { error: "You don't have permission to manage subjects." };

  const parsed = subjectSchema.safeParse(formToObject(formData, ["teacherIds"]));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const { classId, ...data } = parsed.data;

  const target = await resolveTarget(user, classId, String(formData.get("schoolId") ?? "") || undefined);
  if (target.error || !target.schoolId) return { error: target.error };

  const teacherIds = await validTeacherIds(target.schoolId, formData);

  let newId: string;
  try {
    const subject = await db.subject.create({
      data: {
        schoolId: target.schoolId,
        classId: target.classId ?? null,
        name: data.name,
        code: data.code,
        credits: data.credits,
        teachers: teacherIds.length ? { connect: teacherIds.map((id) => ({ id })) } : undefined,
      },
    });
    newId = subject.id;
    await audit({
      action: "subject.create",
      userId: user.id,
      schoolId: target.schoolId,
      entityType: "Subject",
      entityId: subject.id,
      metadata: { code: data.code },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { fieldErrors: { code: "A subject with this code already exists." } };
    }
    throw e;
  }

  revalidatePath("/dashboard/subjects");
  redirect(`/dashboard/subjects/${newId}`);
}

export async function updateSubjectAction(
  _prev: SubjectFormState,
  formData: FormData,
): Promise<SubjectFormState> {
  const user = await requireUser();
  if (!can(user, "subject:manage")) return { error: "You don't have permission to manage subjects." };

  const id = String(formData.get("id") ?? "");
  const existing = await db.subject.findFirst({ where: { id, deletedAt: null, ...schoolScope(user) } });
  if (!existing) return { error: "Subject not found." };

  const parsed = subjectSchema.safeParse(formToObject(formData, ["teacherIds"]));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const { classId, ...data } = parsed.data;

  // Class (if any) must belong to the subject's existing school.
  let resolvedClassId: string | null = null;
  if (classId) {
    const klass = await db.schoolClass.findFirst({
      where: { id: classId, deletedAt: null, schoolId: existing.schoolId },
    });
    if (!klass) return { fieldErrors: { classId: "That class isn't in this school." } };
    resolvedClassId = klass.id;
  }

  const teacherIds = await validTeacherIds(existing.schoolId, formData);

  try {
    await db.subject.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code,
        credits: data.credits,
        classId: resolvedClassId,
        teachers: { set: teacherIds.map((tid) => ({ id: tid })) },
      },
    });
    await audit({
      action: "subject.update",
      userId: user.id,
      schoolId: existing.schoolId,
      entityType: "Subject",
      entityId: id,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { fieldErrors: { code: "A subject with this code already exists." } };
    }
    throw e;
  }

  revalidatePath("/dashboard/subjects");
  revalidatePath(`/dashboard/subjects/${id}`);
  redirect(`/dashboard/subjects/${id}`);
}

export async function deleteSubjectAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "subject:manage")) return;

  const id = String(formData.get("id") ?? "");
  const existing = await db.subject.findFirst({ where: { id, deletedAt: null, ...schoolScope(user) } });
  if (!existing) return;

  await db.subject.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({
    action: "subject.delete",
    userId: user.id,
    schoolId: existing.schoolId,
    entityType: "Subject",
    entityId: id,
  });

  revalidatePath("/dashboard/subjects");
  redirect("/dashboard/subjects");
}
