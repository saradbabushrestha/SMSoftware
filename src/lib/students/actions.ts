"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, type EnrollmentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { DEMO_PASSWORD } from "@/lib/auth/demo-accounts";
import { can, requireUser } from "@/lib/rbac/authorize";
import { audit } from "@/lib/audit";
import {
  createStudentSchema,
  updateStudentSchema,
  formToObject,
} from "@/lib/students/validation";
import { nextAdmissionNumber } from "@/lib/students/queries";

export interface StudentFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
}

function zodToFieldErrors(error: import("zod").ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

function rawValues(formData: FormData): Record<string, string> {
  const v: Record<string, string> = {};
  for (const [k, val] of formData.entries()) {
    if (typeof val === "string" && !k.startsWith("$")) v[k] = val;
  }
  return v;
}

async function activeAcademicYearId(schoolId: string): Promise<string | null> {
  const ay = await db.academicYear.findFirst({
    where: { schoolId, status: "ACTIVE", deletedAt: null },
    orderBy: { startDate: "desc" },
  });
  return ay?.id ?? null;
}

/** Resolve and authorize the school a new/edited student belongs to. */
async function resolveSchoolId(
  user: Awaited<ReturnType<typeof requireUser>>,
  sectionId: string | undefined,
): Promise<{ schoolId?: string; error?: string }> {
  if (sectionId) {
    const section = await db.section.findUnique({
      where: { id: sectionId },
      include: { class: true },
    });
    if (!section) return { error: "The selected class/section no longer exists." };
    const schoolId = section.class.schoolId;
    if (user.role !== "SUPER_ADMIN" && schoolId !== user.schoolId)
      return { error: "You can't assign students outside your school." };
    return { schoolId };
  }
  if (user.role !== "SUPER_ADMIN" && user.schoolId) return { schoolId: user.schoolId };
  return { error: "Select a class & section to determine the school." };
}

export async function createStudentAction(
  _prev: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const user = await requireUser();
  if (!can(user, "student:create")) return { error: "You don't have permission to admit students." };

  const parsed = createStudentSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { fieldErrors: zodToFieldErrors(parsed.error), values: rawValues(formData) };
  }
  const data = parsed.data;

  const resolved = await resolveSchoolId(user, data.sectionId);
  if (resolved.error || !resolved.schoolId) {
    return { error: resolved.error, values: rawValues(formData) };
  }
  const schoolId = resolved.schoolId;

  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return { fieldErrors: { email: "An account with this email already exists." }, values: rawValues(formData) };
  }

  const admissionNumber = data.admissionNumber || (await nextAdmissionNumber(schoolId));
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const ayId = await activeAcademicYearId(schoolId);

  let newId: string;
  try {
    const student = await db.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          role: "STUDENT",
          status: "ACTIVE",
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          schoolId,
        },
      });
      const createdStudent = await tx.student.create({
        data: {
          schoolId,
          userId: createdUser.id,
          admissionNumber,
          rollNumber: data.rollNumber,
          gender: data.gender,
          bloodGroup: data.bloodGroup,
          dateOfBirth: data.dateOfBirth,
          nationality: data.nationality,
          address: data.address,
          admittedOn: new Date(),
          status: "ACTIVE",
        },
      });
      if (data.sectionId && ayId) {
        await tx.enrollment.create({
          data: {
            schoolId,
            studentId: createdStudent.id,
            sectionId: data.sectionId,
            academicYearId: ayId,
            rollNumber: data.rollNumber,
          },
        });
      }
      return createdStudent;
    });
    newId = student.id;
    await audit({
      action: "student.create",
      userId: user.id,
      schoolId,
      entityType: "Student",
      entityId: student.id,
      metadata: { admissionNumber, email: data.email },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "A student with this admission number already exists.", values: rawValues(formData) };
    }
    throw e;
  }

  revalidatePath("/dashboard/students");
  redirect(`/dashboard/students/${newId}`);
}

export async function updateStudentAction(
  _prev: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const user = await requireUser();
  if (!can(user, "student:update")) return { error: "You don't have permission to edit students." };

  const id = String(formData.get("id") ?? "");
  const existing = await db.student.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {}),
    },
  });
  if (!existing) return { error: "Student not found." };

  const parsed = updateStudentSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { fieldErrors: zodToFieldErrors(parsed.error), values: rawValues(formData) };
  }
  const data = parsed.data;

  try {
    await db.$transaction(async (tx) => {
      await tx.student.update({
        where: { id },
        data: {
          rollNumber: data.rollNumber,
          gender: data.gender,
          bloodGroup: data.bloodGroup,
          dateOfBirth: data.dateOfBirth,
          nationality: data.nationality,
          address: data.address,
          status: data.status,
          admissionNumber: data.admissionNumber || existing.admissionNumber,
        },
      });
      await tx.user.update({
        where: { id: existing.userId },
        data: { firstName: data.firstName, lastName: data.lastName, phone: data.phone },
      });

      // Re-assign section for the active academic year if changed.
      if (data.sectionId) {
        const ayId = await activeAcademicYearId(existing.schoolId);
        if (ayId) {
          await tx.enrollment.upsert({
            where: { studentId_academicYearId: { studentId: id, academicYearId: ayId } },
            update: { sectionId: data.sectionId, status: data.status, rollNumber: data.rollNumber },
            create: {
              schoolId: existing.schoolId,
              studentId: id,
              sectionId: data.sectionId,
              academicYearId: ayId,
              rollNumber: data.rollNumber,
            },
          });
        }
      }
    });
    await audit({
      action: "student.update",
      userId: user.id,
      schoolId: existing.schoolId,
      entityType: "Student",
      entityId: id,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "That admission number is already in use.", values: rawValues(formData) };
    }
    throw e;
  }

  revalidatePath("/dashboard/students");
  revalidatePath(`/dashboard/students/${id}`);
  redirect(`/dashboard/students/${id}`);
}

export async function deleteStudentAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "student:delete")) return;

  const id = String(formData.get("id") ?? "");
  const existing = await db.student.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {}),
    },
  });
  if (!existing) return;

  const now = new Date();
  await db.$transaction([
    db.student.update({ where: { id }, data: { deletedAt: now, status: "WITHDRAWN" } }),
    db.user.update({ where: { id: existing.userId }, data: { deletedAt: now, status: "DISABLED" } }),
  ]);
  await audit({
    action: "student.delete",
    userId: user.id,
    schoolId: existing.schoolId,
    entityType: "Student",
    entityId: id,
  });

  revalidatePath("/dashboard/students");
  redirect("/dashboard/students");
}

export async function changeStudentStatusAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "student:promote")) return;

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const allowed = ["ACTIVE", "PROMOTED", "TRANSFERRED", "GRADUATED", "SUSPENDED", "WITHDRAWN", "ALUMNI"];
  if (!allowed.includes(status)) return;

  const existing = await db.student.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {}),
    },
  });
  if (!existing) return;

  await db.student.update({
    where: { id },
    data: { status: status as EnrollmentStatus },
  });
  await audit({
    action: "student.status",
    userId: user.id,
    schoolId: existing.schoolId,
    entityType: "Student",
    entityId: id,
    metadata: { status },
  });

  revalidatePath("/dashboard/students");
  revalidatePath(`/dashboard/students/${id}`);
}
