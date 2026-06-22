"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/rbac/authorize";
import { audit } from "@/lib/audit";
import { examSchema, formToObject } from "@/lib/exams/validation";

export interface ExamFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export interface SaveGradesState {
  ok?: boolean;
  error?: string;
  saved?: number;
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

function classScope(user: SessionUserT): { schoolId?: string } {
  return user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {};
}

export async function createExamAction(_prev: ExamFormState, formData: FormData): Promise<ExamFormState> {
  const user = await requireUser();
  if (!can(user, "exam:manage")) return { error: "You don't have permission to manage exams." };

  const parsed = examSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const data = parsed.data;

  const klass = await db.schoolClass.findFirst({ where: { id: data.classId, deletedAt: null, ...classScope(user) } });
  if (!klass) return { fieldErrors: { classId: "Select a valid class." } };

  const ay = await db.academicYear.findFirst({ where: { schoolId: klass.schoolId, status: "ACTIVE" } });

  const exam = await db.exam.create({
    data: {
      schoolId: klass.schoolId,
      classId: klass.id,
      academicYearId: ay?.id,
      name: data.name,
      type: data.type,
      maxMarks: data.maxMarks,
      examDate: data.examDate,
    },
  });
  await audit({ action: "exam.create", userId: user.id, schoolId: klass.schoolId, entityType: "Exam", entityId: exam.id, metadata: { name: data.name } });

  revalidatePath("/dashboard/exams");
  redirect(`/dashboard/exams/${exam.id}`);
}

export async function updateExamAction(_prev: ExamFormState, formData: FormData): Promise<ExamFormState> {
  const user = await requireUser();
  if (!can(user, "exam:manage")) return { error: "You don't have permission to manage exams." };

  const id = String(formData.get("id") ?? "");
  const existing = await db.exam.findFirst({ where: { id, deletedAt: null, ...classScope(user) } });
  if (!existing) return { error: "Exam not found." };

  const parsed = examSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const data = parsed.data;

  const klass = await db.schoolClass.findFirst({ where: { id: data.classId, deletedAt: null, schoolId: existing.schoolId } });
  if (!klass) return { fieldErrors: { classId: "That class isn't in this school." } };

  await db.exam.update({
    where: { id },
    data: { name: data.name, type: data.type, classId: klass.id, maxMarks: data.maxMarks, examDate: data.examDate },
  });
  await audit({ action: "exam.update", userId: user.id, schoolId: existing.schoolId, entityType: "Exam", entityId: id });

  revalidatePath("/dashboard/exams");
  revalidatePath(`/dashboard/exams/${id}`);
  redirect(`/dashboard/exams/${id}`);
}

export async function deleteExamAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "exam:manage")) return;

  const id = String(formData.get("id") ?? "");
  const existing = await db.exam.findFirst({ where: { id, deletedAt: null, ...classScope(user) } });
  if (!existing) return;

  await db.exam.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ action: "exam.delete", userId: user.id, schoolId: existing.schoolId, entityType: "Exam", entityId: id });

  revalidatePath("/dashboard/exams");
  redirect("/dashboard/exams");
}

export async function togglePublishAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "exam:manage")) return;

  const id = String(formData.get("id") ?? "");
  const publish = String(formData.get("publish") ?? "") === "true";
  const existing = await db.exam.findFirst({ where: { id, deletedAt: null, ...classScope(user) } });
  if (!existing) return;

  await db.exam.update({ where: { id }, data: { published: publish } });
  await audit({ action: "exam.publish", userId: user.id, schoolId: existing.schoolId, entityType: "Exam", entityId: id, metadata: { published: publish } });

  revalidatePath(`/dashboard/exams/${id}`);
  revalidatePath("/dashboard/grades");
}

export async function saveGradesAction(_prev: SaveGradesState, formData: FormData): Promise<SaveGradesState> {
  const user = await requireUser();
  if (!can(user, "grade:manage")) return { error: "You don't have permission to enter grades." };

  const examId = String(formData.get("examId") ?? "");
  const subjectId = String(formData.get("subjectId") ?? "");
  const exam = await db.exam.findFirst({ where: { id: examId, deletedAt: null, ...classScope(user) } });
  if (!exam) return { error: "Exam not found." };

  const subject = await db.subject.findFirst({
    where: { id: subjectId, deletedAt: null, schoolId: exam.schoolId, OR: [{ classId: exam.classId }, { classId: null }] },
  });
  if (!subject) return { error: "Subject is not valid for this exam." };

  // Only accept marks for students enrolled in the exam's class.
  const enrollments = await db.enrollment.findMany({
    where: { section: { classId: exam.classId }, deletedAt: null, academicYear: { status: "ACTIVE" }, student: { deletedAt: null } },
    select: { studentId: true },
  });
  const enrolled = new Set(enrollments.map((e) => e.studentId));

  const updates: { studentId: string; marks: number }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("marks_")) continue;
    const studentId = key.slice("marks_".length);
    if (!enrolled.has(studentId)) continue;
    const raw = String(value).trim();
    if (raw === "") continue; // leave unmarked
    const num = Number(raw);
    if (Number.isNaN(num)) continue;
    updates.push({ studentId, marks: Math.max(0, Math.min(exam.maxMarks, num)) });
  }

  if (updates.length === 0) return { error: "No marks entered." };
  await db.$transaction(async (tx) => {
    for (const u of updates) {
      await tx.examResult.upsert({
        where: { examId_studentId_subjectId: { examId, studentId: u.studentId, subjectId } },
        update: { marksObtained: u.marks, maxMarks: exam.maxMarks },
        create: { examId, studentId: u.studentId, subjectId, marksObtained: u.marks, maxMarks: exam.maxMarks },
      });
    }
  });
  const saved = updates.length;
  await audit({ action: "grade.save", userId: user.id, schoolId: exam.schoolId, entityType: "Exam", entityId: examId, metadata: { subjectId, count: saved } });

  revalidatePath(`/dashboard/exams/${examId}`);
  revalidatePath("/dashboard/grades");
  return { ok: true, saved };
}
