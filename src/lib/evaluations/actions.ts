"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/rbac/authorize";
import { audit } from "@/lib/audit";
import { evaluationSchema, formToObject } from "@/lib/evaluations/validation";

export interface EvaluationFormState {
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

function teacherScope(user: SessionUserT) {
  return user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {};
}

export async function createEvaluationAction(_prev: EvaluationFormState, formData: FormData): Promise<EvaluationFormState> {
  const user = await requireUser();
  if (!can(user, "teacher:evaluate")) return { error: "You don't have permission to evaluate teachers." };

  const teacherId = String(formData.get("teacherId") ?? "");
  const teacher = await db.teacher.findFirst({ where: { id: teacherId, deletedAt: null, ...teacherScope(user) } });
  if (!teacher) return { error: "Teacher not found." };

  const parsed = evaluationSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const d = parsed.data;

  const ev = await db.teacherEvaluation.create({
    data: {
      schoolId: teacher.schoolId,
      teacherId: teacher.id,
      evaluatorId: user.id,
      period: d.period,
      teaching: d.teaching,
      classroom: d.classroom,
      collaboration: d.collaboration,
      punctuality: d.punctuality,
      comment: d.comment,
    },
  });
  await audit({ action: "evaluation.create", userId: user.id, schoolId: teacher.schoolId, entityType: "TeacherEvaluation", entityId: ev.id, metadata: { period: d.period } });

  revalidatePath(`/dashboard/teachers/${teacher.id}`);
  redirect(`/dashboard/teachers/${teacher.id}/evaluations/${ev.id}`);
}

export async function deleteEvaluationAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "teacher:evaluate")) return;

  const id = String(formData.get("id") ?? "");
  const existing = await db.teacherEvaluation.findFirst({ where: { id, deletedAt: null, ...teacherScope(user) } });
  if (!existing) return;

  await db.teacherEvaluation.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ action: "evaluation.delete", userId: user.id, schoolId: existing.schoolId, entityType: "TeacherEvaluation", entityId: id });

  revalidatePath(`/dashboard/teachers/${existing.teacherId}`);
  redirect(`/dashboard/teachers/${existing.teacherId}`);
}
