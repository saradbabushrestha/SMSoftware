import type { LoanStatus } from "@prisma/client";

/** Overdue fine per day (NPR). */
export const FINE_PER_DAY = 5;

const DAY = 86_400_000;

/** Days a loan is/was overdue (returnedAt if returned, else now). */
export function overdueDays(dueDate: Date, returnedAt: Date | null): number {
  const end = returnedAt ?? new Date();
  const diff = Math.floor((end.getTime() - dueDate.getTime()) / DAY);
  return Math.max(0, diff);
}

export function fineFor(dueDate: Date, returnedAt: Date | null): number {
  return overdueDays(dueDate, returnedAt) * FINE_PER_DAY;
}

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "info" | "outline";

/** Display status: RETURNED, OVERDUE (active + past due), or BORROWED. */
export function loanStatus(status: LoanStatus, dueDate: Date): { label: string; variant: BadgeVariant } {
  if (status === "RETURNED") return { label: "Returned", variant: "secondary" };
  if (dueDate.getTime() < Date.now()) return { label: "Overdue", variant: "destructive" };
  return { label: "Borrowed", variant: "info" };
}

export function availabilityVariant(available: number): BadgeVariant {
  return available > 0 ? "success" : "destructive";
}

export function formatNpr(amount: number): string {
  return `₨ ${Math.round(amount).toLocaleString("en-US")}`;
}
