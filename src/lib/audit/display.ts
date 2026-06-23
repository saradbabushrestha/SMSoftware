type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "info" | "outline";

/** Category = the part of the action before the first dot (e.g. "student" in "student.create"). */
export function actionCategory(action: string): string {
  return action.split(".")[0] ?? action;
}

/** Colour an action by what it implies. */
export function actionTone(action: string): BadgeVariant {
  if (action.includes("fail")) return "destructive";
  if (action.endsWith(".delete") || action.endsWith(".unlink")) return "destructive";
  if (action.endsWith(".create")) return "success";
  if (action.startsWith("auth.")) return "info";
  if (action.endsWith(".status") || action.endsWith(".publish") || action.endsWith(".reset_password")) return "warning";
  return "secondary";
}

/** "student.create" → "Student create" (readable, keeps the verb). */
export function humanizeAction(action: string): string {
  const text = action.replace(/[._]/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const AUDIT_RANGES = [
  ["today", "Today"],
  ["7d", "Last 7 days"],
  ["30d", "Last 30 days"],
  ["all", "All time"],
] as const;

export type AuditRange = (typeof AUDIT_RANGES)[number][0];

/** Translate a range key into a `gte` Date (or null for all time). */
export function rangeSince(range: string | undefined): Date | null {
  const now = Date.now();
  if (range === "7d") return new Date(now - 7 * 86_400_000);
  if (range === "30d") return new Date(now - 30 * 86_400_000);
  if (range === "all") return null;
  // default: today (local midnight)
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
