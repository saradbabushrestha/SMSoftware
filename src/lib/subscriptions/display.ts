import type { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  TRIAL: "Trial",
  STARTER: "Starter",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

export const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIALING: "Trialing",
  ACTIVE: "Active",
  PAST_DUE: "Past due",
  CANCELLED: "Cancelled",
};

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "info" | "outline";

export const PLAN_VARIANT: Record<SubscriptionPlan, BadgeVariant> = {
  TRIAL: "secondary",
  STARTER: "info",
  PRO: "default",
  ENTERPRISE: "success",
};

export const STATUS_VARIANT: Record<SubscriptionStatus, BadgeVariant> = {
  TRIALING: "warning",
  ACTIVE: "success",
  PAST_DUE: "destructive",
  CANCELLED: "secondary",
};

export const PLAN_OPTIONS: { value: SubscriptionPlan; label: string }[] = [
  { value: "TRIAL", label: "Trial" },
  { value: "STARTER", label: "Starter" },
  { value: "PRO", label: "Pro" },
  { value: "ENTERPRISE", label: "Enterprise" },
];

export const STATUS_OPTIONS: { value: SubscriptionStatus; label: string }[] = [
  { value: "TRIALING", label: "Trialing" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAST_DUE", label: "Past due" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function formatNpr(amount: number): string {
  return `₨ ${Math.round(amount).toLocaleString("en-US")}`;
}

export function fmtDate(d: Date | null): string {
  return d ? d.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "—";
}

export function dateInputValue(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

/** Seat usage as a percentage + a tone for the meter. */
export function seatUsage(used: number, seats: number): { pct: number; tone: "primary" | "warning" | "destructive"; over: boolean } {
  const pct = seats > 0 ? Math.min(100, Math.round((used / seats) * 100)) : 100;
  const ratio = seats > 0 ? used / seats : 1;
  const tone = ratio >= 1 ? "destructive" : ratio >= 0.8 ? "warning" : "primary";
  return { pct, tone, over: used > seats };
}
