import type { LedgerType } from "@prisma/client";

export const LEDGER_TYPE_LABELS: Record<LedgerType, string> = {
  INCOME: "Income",
  EXPENSE: "Expense",
};

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "info" | "outline";

export const LEDGER_TYPE_VARIANT: Record<LedgerType, BadgeVariant> = {
  INCOME: "success",
  EXPENSE: "destructive",
};

/** Common ledger categories suggested in the form (free text is also allowed). */
export const INCOME_CATEGORIES = ["Tuition fees", "Admission fees", "Donations", "Grants", "Hostel", "Transport", "Other income"];
export const EXPENSE_CATEGORIES = ["Salaries", "Utilities", "Maintenance", "Supplies", "Rent", "Transport", "Events", "Other expense"];

export function formatNpr(amount: number): string {
  return `₨ ${Math.round(amount).toLocaleString("en-US")}`;
}

/** Signed amount, e.g. "+ ₨ 5,000" / "− ₨ 5,000". */
export function formatSigned(type: LedgerType, amount: number): string {
  return `${type === "INCOME" ? "+" : "−"} ${formatNpr(amount)}`;
}

export function fmtDate(d: Date): string {
  return d.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** First day of the current month as "YYYY-MM-DD" (for default filter). */
export function monthStart(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/** "YYYY-MM-DD" of a Date (for date inputs). */
export function dateInputValue(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
