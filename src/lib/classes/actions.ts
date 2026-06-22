"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/rbac/authorize";
import { audit } from "@/lib/audit";
import { classSchema, sectionSchema, formToObject } from "@/lib/classes/validation";

export interface ClassFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export interface SectionFormState {
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

function classScope(user: SessionUserT) {
  return user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {};
}

async function resolveSchoolId(
  user: SessionUserT,
  schoolIdField: string | undefined,
): Promise<{ schoolId?: string; error?: string }> {
  if (user.role === "SUPER_ADMIN") {
    if (!schoolIdField) return { error: "Select a school for this class." };
    const school = await db.school.findFirst({ where: { id: schoolIdField, deletedAt: null } });
    if (!school) return { error: "The selected school no longer exists." };
    return { schoolId: school.id };
  }
  if (user.schoolId) return { schoolId: user.schoolId };
  return { error: "No school associated with your account." };
}

// ─── Classes ─────────────────────────────────────────────────────────────────

export async function createClassAction(
  _prev: ClassFormState,
  formData: FormData,
): Promise<ClassFormState> {
  const user = await requireUser();
  if (!can(user, "class:manage")) return { error: "You don't have permission to manage classes." };

  const parsed = classSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };

  const resolved = await resolveSchoolId(user, String(formData.get("schoolId") ?? "") || undefined);
  if (resolved.error || !resolved.schoolId) return { error: resolved.error };

  let newId: string;
  try {
    const created = await db.schoolClass.create({
      data: { schoolId: resolved.schoolId, ...parsed.data },
    });
    newId = created.id;
    await audit({
      action: "class.create",
      userId: user.id,
      schoolId: resolved.schoolId,
      entityType: "SchoolClass",
      entityId: created.id,
      metadata: { code: parsed.data.code },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { fieldErrors: { code: "A class with this code already exists." } };
    }
    throw e;
  }

  revalidatePath("/dashboard/classes");
  redirect(`/dashboard/classes/${newId}`);
}

export async function updateClassAction(
  _prev: ClassFormState,
  formData: FormData,
): Promise<ClassFormState> {
  const user = await requireUser();
  if (!can(user, "class:manage")) return { error: "You don't have permission to manage classes." };

  const id = String(formData.get("id") ?? "");
  const existing = await db.schoolClass.findFirst({ where: { id, deletedAt: null, ...classScope(user) } });
  if (!existing) return { error: "Class not found." };

  const parsed = classSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };

  try {
    await db.schoolClass.update({ where: { id }, data: parsed.data });
    await audit({
      action: "class.update",
      userId: user.id,
      schoolId: existing.schoolId,
      entityType: "SchoolClass",
      entityId: id,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { fieldErrors: { code: "A class with this code already exists." } };
    }
    throw e;
  }

  revalidatePath("/dashboard/classes");
  revalidatePath(`/dashboard/classes/${id}`);
  redirect(`/dashboard/classes/${id}`);
}

export async function deleteClassAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "class:manage")) return;

  const id = String(formData.get("id") ?? "");
  const existing = await db.schoolClass.findFirst({ where: { id, deletedAt: null, ...classScope(user) } });
  if (!existing) return;

  const now = new Date();
  await db.$transaction([
    db.section.updateMany({ where: { classId: id, deletedAt: null }, data: { deletedAt: now } }),
    db.schoolClass.update({ where: { id }, data: { deletedAt: now } }),
  ]);
  await audit({
    action: "class.delete",
    userId: user.id,
    schoolId: existing.schoolId,
    entityType: "SchoolClass",
    entityId: id,
  });

  revalidatePath("/dashboard/classes");
  redirect("/dashboard/classes");
}

// ─── Sections ────────────────────────────────────────────────────────────────

/** Ensure a chosen class teacher belongs to the same school. */
async function validClassTeacherId(schoolId: string, teacherId?: string): Promise<string | null> {
  if (!teacherId) return null;
  const t = await db.teacher.findFirst({ where: { id: teacherId, schoolId, deletedAt: null } });
  return t?.id ?? null;
}

export async function createSectionAction(
  _prev: SectionFormState,
  formData: FormData,
): Promise<SectionFormState> {
  const user = await requireUser();
  if (!can(user, "class:manage")) return { error: "You don't have permission to manage classes." };

  const classId = String(formData.get("classId") ?? "");
  const klass = await db.schoolClass.findFirst({ where: { id: classId, deletedAt: null, ...classScope(user) } });
  if (!klass) return { error: "Class not found." };

  const parsed = sectionSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const { classTeacherId, ...data } = parsed.data;
  const teacherId = await validClassTeacherId(klass.schoolId, classTeacherId);

  try {
    const section = await db.section.create({
      data: { classId, ...data, classTeacherId: teacherId },
    });
    await audit({
      action: "section.create",
      userId: user.id,
      schoolId: klass.schoolId,
      entityType: "Section",
      entityId: section.id,
      metadata: { classId, name: data.name },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { fieldErrors: { name: "A section with this name already exists in this class." } };
    }
    throw e;
  }

  revalidatePath(`/dashboard/classes/${classId}`);
  revalidatePath("/dashboard/classes");
  return { ok: true };
}

export async function updateSectionAction(
  _prev: SectionFormState,
  formData: FormData,
): Promise<SectionFormState> {
  const user = await requireUser();
  if (!can(user, "class:manage")) return { error: "You don't have permission to manage classes." };

  const id = String(formData.get("id") ?? "");
  const existing = await db.section.findFirst({
    where: { id, deletedAt: null, class: { deletedAt: null, ...classScope(user) } },
    include: { class: true },
  });
  if (!existing) return { error: "Section not found." };

  const parsed = sectionSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const { classTeacherId, ...data } = parsed.data;
  const teacherId = await validClassTeacherId(existing.class.schoolId, classTeacherId);

  try {
    await db.section.update({ where: { id }, data: { ...data, classTeacherId: teacherId } });
    await audit({
      action: "section.update",
      userId: user.id,
      schoolId: existing.class.schoolId,
      entityType: "Section",
      entityId: id,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { fieldErrors: { name: "A section with this name already exists in this class." } };
    }
    throw e;
  }

  revalidatePath(`/dashboard/classes/${existing.classId}`);
  return { ok: true };
}

export async function deleteSectionAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "class:manage")) return;

  const id = String(formData.get("id") ?? "");
  const existing = await db.section.findFirst({
    where: { id, deletedAt: null, class: { deletedAt: null, ...classScope(user) } },
    include: { class: true },
  });
  if (!existing) return;

  await db.section.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({
    action: "section.delete",
    userId: user.id,
    schoolId: existing.class.schoolId,
    entityType: "Section",
    entityId: id,
  });

  revalidatePath(`/dashboard/classes/${existing.classId}`);
  revalidatePath("/dashboard/classes");
}
