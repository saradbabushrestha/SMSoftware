import type { SubmissionStatus } from "@prisma/client";

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "info" | "outline";

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  SUBMITTED: "Submitted",
  GRADED: "Graded",
};

export const SUBMISSION_STATUS_VARIANT: Record<SubmissionStatus, BadgeVariant> = {
  SUBMITTED: "info",
  GRADED: "success",
};

export function isOverdue(dueDate: Date): boolean {
  return dueDate.getTime() < Date.now();
}

export function formatDue(dueDate: Date): string {
  return dueDate.toLocaleString("en", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function gradePercent(grade: number, maxPoints: number): number {
  return maxPoints > 0 ? Math.round((grade / maxPoints) * 1000) / 10 : 0;
}

/** A student's status for one assignment. */
export function studentAssignmentState(
  submission: { status: SubmissionStatus } | null,
  dueDate: Date,
): { label: string; variant: BadgeVariant } {
  if (submission?.status === "GRADED") return { label: "Graded", variant: "success" };
  if (submission) return { label: "Submitted", variant: "info" };
  if (isOverdue(dueDate)) return { label: "Missing", variant: "destructive" };
  return { label: "Pending", variant: "warning" };
}
