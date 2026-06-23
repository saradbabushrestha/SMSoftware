"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/rbac/authorize";
import { audit } from "@/lib/audit";
import { assignmentSchema, submitSchema, gradeSchema, formToObject } from "@/lib/assignments/validation";

export interface AssignmentFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export interface SubmitState {
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

function schoolScope(user: SessionUserT) {
  return user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {};
}

export async function createAssignmentAction(_prev: AssignmentFormState, formData: FormData): Promise<AssignmentFormState> {
  const user = await requireUser();
  if (!can(user, "assignment:manage")) return { error: "You don't have permission to manage assignments." };

  const parsed = assignmentSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const data = parsed.data;

  const section = await db.section.findFirst({ where: { id: data.sectionId, deletedAt: null, class: { deletedAt: null, ...schoolScope(user) } }, include: { class: true } });
  if (!section) return { fieldErrors: { sectionId: "Select a valid section." } };
  const subject = await db.subject.findFirst({ where: { id: data.subjectId, deletedAt: null, schoolId: section.class.schoolId } });
  if (!subject) return { fieldErrors: { subjectId: "Select a subject from the same school." } };

  const assignment = await db.assignment.create({
    data: {
      schoolId: section.class.schoolId,
      sectionId: section.id,
      subjectId: subject.id,
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      maxPoints: data.maxPoints,
      createdById: user.id,
    },
  });
  await audit({ action: "assignment.create", userId: user.id, schoolId: assignment.schoolId, entityType: "Assignment", entityId: assignment.id, metadata: { title: data.title } });

  revalidatePath("/dashboard/assignments");
  redirect(`/dashboard/assignments/${assignment.id}`);
}

export async function updateAssignmentAction(_prev: AssignmentFormState, formData: FormData): Promise<AssignmentFormState> {
  const user = await requireUser();
  if (!can(user, "assignment:manage")) return { error: "You don't have permission to manage assignments." };

  const id = String(formData.get("id") ?? "");
  const existing = await db.assignment.findFirst({ where: { id, deletedAt: null, ...schoolScope(user) } });
  if (!existing) return { error: "Assignment not found." };

  const parsed = assignmentSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const data = parsed.data;

  const section = await db.section.findFirst({ where: { id: data.sectionId, deletedAt: null, class: { schoolId: existing.schoolId } }, include: { class: true } });
  if (!section) return { fieldErrors: { sectionId: "That section isn't in this school." } };
  const subject = await db.subject.findFirst({ where: { id: data.subjectId, deletedAt: null, schoolId: existing.schoolId } });
  if (!subject) return { fieldErrors: { subjectId: "That subject isn't in this school." } };

  await db.assignment.update({
    where: { id },
    data: { sectionId: section.id, subjectId: subject.id, title: data.title, description: data.description, dueDate: data.dueDate, maxPoints: data.maxPoints },
  });
  await audit({ action: "assignment.update", userId: user.id, schoolId: existing.schoolId, entityType: "Assignment", entityId: id });

  revalidatePath("/dashboard/assignments");
  revalidatePath(`/dashboard/assignments/${id}`);
  redirect(`/dashboard/assignments/${id}`);
}

export async function deleteAssignmentAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "assignment:manage")) return;

  const id = String(formData.get("id") ?? "");
  const existing = await db.assignment.findFirst({ where: { id, deletedAt: null, ...schoolScope(user) } });
  if (!existing) return;

  await db.assignment.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ action: "assignment.delete", userId: user.id, schoolId: existing.schoolId, entityType: "Assignment", entityId: id });

  revalidatePath("/dashboard/assignments");
  redirect("/dashboard/assignments");
}

export async function submitAssignmentAction(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const user = await requireUser();
  if (!can(user, "assignment:submit")) return { error: "You don't have permission to submit." };

  const assignmentId = String(formData.get("assignmentId") ?? "");
  const assignment = await db.assignment.findFirst({ where: { id: assignmentId, deletedAt: null, ...schoolScope(user) } });
  if (!assignment) return { error: "Assignment not found." };

  // The submitter must be a student enrolled in the assignment's section.
  const student = await db.student.findFirst({ where: { userId: user.id, deletedAt: null } });
  if (!student) return { error: "Only students can submit." };
  const enrolled = await db.enrollment.findFirst({ where: { studentId: student.id, sectionId: assignment.sectionId, deletedAt: null } });
  if (!enrolled) return { error: "This assignment isn't for your class." };

  const existing = await db.submission.findUnique({ where: { assignmentId_studentId: { assignmentId, studentId: student.id } } });
  if (existing?.status === "GRADED") return { error: "Your submission has been graded and can't be changed." };

  const parsed = submitSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };

  await db.submission.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId: student.id } },
    update: { content: parsed.data.content, status: "SUBMITTED", submittedAt: new Date() },
    create: { assignmentId, studentId: student.id, content: parsed.data.content, status: "SUBMITTED" },
  });
  await audit({ action: "assignment.submit", userId: user.id, schoolId: assignment.schoolId, entityType: "Assignment", entityId: assignmentId });

  revalidatePath(`/dashboard/assignments/${assignmentId}`);
  return { ok: true };
}

export async function gradeSubmissionAction(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const user = await requireUser();
  if (!can(user, "assignment:manage")) return { error: "You don't have permission to grade." };

  const submissionId = String(formData.get("submissionId") ?? "");
  const submission = await db.submission.findFirst({
    where: { id: submissionId, assignment: { deletedAt: null, ...schoolScope(user) } },
    include: { assignment: true },
  });
  if (!submission) return { error: "Submission not found." };

  const parsed = gradeSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const grade = Math.min(parsed.data.grade, submission.assignment.maxPoints);

  await db.submission.update({
    where: { id: submissionId },
    data: { grade, feedback: parsed.data.feedback, status: "GRADED", gradedAt: new Date(), gradedById: user.id },
  });
  await audit({ action: "assignment.grade", userId: user.id, schoolId: submission.assignment.schoolId, entityType: "Submission", entityId: submissionId, metadata: { grade } });

  revalidatePath(`/dashboard/assignments/${submission.assignmentId}`);
  return { ok: true };
}
