import type { PayrollStatus } from "@prisma/client";

export const PAYROLL_STATUS_LABELS: Record<PayrollStatus, string> = {
  DRAFT: "Draft",
  PAID: "Paid",
};

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "info" | "outline";

export const PAYROLL_STATUS_VARIANT: Record<PayrollStatus, BadgeVariant> = {
  DRAFT: "warning",
  PAID: "success",
};

export function formatNpr(amount: number): string {
  return `₨ ${Math.round(amount).toLocaleString("en-US")}`;
}

/** "2024-09" → "September 2024". */
export function formatMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function computeNetPay(basic: number, allowances: number, deductions: number, tax: number): number {
  return Math.max(0, basic + allowances - deductions - tax);
}

/** Current month as "YYYY-MM" from a Date. */
export function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
