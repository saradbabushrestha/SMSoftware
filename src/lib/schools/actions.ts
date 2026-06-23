"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/rbac/authorize";
import { audit } from "@/lib/audit";
import { schoolSchema, formToObject } from "@/lib/schools/validation";

export interface SchoolFormState {
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

export async function createSchoolAction(_prev: SchoolFormState, formData: FormData): Promise<SchoolFormState> {
  const user = await requireUser();
  if (!can(user, "school:manage")) return { error: "Only a super admin can create schools." };

  const parsed = schoolSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };

  let school;
  try {
    school = await db.school.create({ data: parsed.data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { fieldErrors: { code: "A school with this code already exists." } };
    }
    throw e;
  }
  await audit({ action: "school.create", userId: user.id, schoolId: school.id, entityType: "School", entityId: school.id, metadata: { code: school.code } });

  revalidatePath("/dashboard/schools");
  redirect(`/dashboard/schools/${school.id}`);
}

export async function updateSchoolAction(_prev: SchoolFormState, formData: FormData): Promise<SchoolFormState> {
  const user = await requireUser();
  // Super admin edits any school; a school admin may edit only their own.
  if (!can(user, "school:manage") && !can(user, "school:view")) return { error: "You don't have permission to edit schools." };

  const id = String(formData.get("id") ?? "");
  if (user.role !== "SUPER_ADMIN" && id !== user.schoolId) return { error: "School not found." };
  const existing = await db.school.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return { error: "School not found." };

  const parsed = schoolSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };

  try {
    await db.school.update({ where: { id }, data: parsed.data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { fieldErrors: { code: "A school with this code already exists." } };
    }
    throw e;
  }
  await audit({ action: "school.update", userId: user.id, schoolId: id, entityType: "School", entityId: id });

  revalidatePath("/dashboard/schools");
  revalidatePath(`/dashboard/schools/${id}`);
  redirect(`/dashboard/schools/${id}`);
}

export async function toggleSchoolActiveAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "school:manage")) return;

  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  const existing = await db.school.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return;

  await db.school.update({ where: { id }, data: { isActive: active } });
  await audit({ action: "school.status", userId: user.id, schoolId: id, entityType: "School", entityId: id, metadata: { isActive: active } });

  revalidatePath("/dashboard/schools");
  revalidatePath(`/dashboard/schools/${id}`);
}

export async function deleteSchoolAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "school:manage")) return;

  const id = String(formData.get("id") ?? "");
  if (id === user.schoolId) return; // never archive your own school
  const existing = await db.school.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return;

  await db.school.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  await audit({ action: "school.delete", userId: user.id, schoolId: id, entityType: "School", entityId: id });

  revalidatePath("/dashboard/schools");
  redirect("/dashboard/schools");
}
