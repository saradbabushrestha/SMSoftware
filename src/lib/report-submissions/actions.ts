"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/rbac/authorize";
import { audit } from "@/lib/audit";
import { submissionSchema, formToObject } from "@/lib/report-submissions/validation";

export interface SubmissionFormState {
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

function scope(user: SessionUserT) {
  return user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {};
}

export async function submitReportAction(_prev: SubmissionFormState, formData: FormData): Promise<SubmissionFormState> {
  const user = await requireUser();
  if (!can(user, "report:view") || user.role === "PARENT" || user.role === "STUDENT") {
    return { error: "You don't have permission to submit reports." };
  }
  if (!user.schoolId) return { error: "Switch to a specific school to submit a report." };

  const parsed = submissionSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const d = parsed.data;

  const sub = await db.reportSubmission.create({
    data: { schoolId: user.schoolId, title: d.title, category: d.category, period: d.period, summary: d.summary, submittedById: user.id },
  });
  await audit({ action: "report.submit", userId: user.id, schoolId: user.schoolId, entityType: "ReportSubmission", entityId: sub.id });

  revalidatePath("/dashboard/reports/submissions");
  redirect(`/dashboard/reports/submissions/${sub.id}`);
}

async function review(formData: FormData, status: "APPROVED" | "REJECTED") {
  const user = await requireUser();
  if (!can(user, "report:approve")) return;

  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  const existing = await db.reportSubmission.findFirst({ where: { id, deletedAt: null, status: "SUBMITTED", ...scope(user) } });
  if (!existing) return;

  await db.reportSubmission.update({
    where: { id },
    data: { status, reviewedById: user.id, reviewedAt: new Date(), reviewNote: note },
  });
  await audit({ action: status === "APPROVED" ? "report.approve" : "report.reject", userId: user.id, schoolId: existing.schoolId, entityType: "ReportSubmission", entityId: id });

  revalidatePath("/dashboard/reports/submissions");
  revalidatePath(`/dashboard/reports/submissions/${id}`);
  redirect(`/dashboard/reports/submissions/${id}`);
}

export async function approveReportAction(formData: FormData): Promise<void> {
  await review(formData, "APPROVED");
}

export async function rejectReportAction(formData: FormData): Promise<void> {
  await review(formData, "REJECTED");
}

export async function deleteReportAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const existing = await db.reportSubmission.findFirst({ where: { id, deletedAt: null, ...scope(user) } });
  if (!existing) return;
  // Approvers may remove any; authors may remove their own while still pending.
  const allowed = can(user, "report:approve") || (existing.submittedById === user.id && existing.status === "SUBMITTED");
  if (!allowed) return;

  await db.reportSubmission.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ action: "report.delete", userId: user.id, schoolId: existing.schoolId, entityType: "ReportSubmission", entityId: id });

  revalidatePath("/dashboard/reports/submissions");
  redirect("/dashboard/reports/submissions");
}
