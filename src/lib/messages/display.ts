export type Box = "inbox" | "sent";

export function normalizeBox(value: string | undefined): Box {
  return value === "sent" ? "sent" : "inbox";
}

export function fmtDateTime(d: Date): string {
  return d.toLocaleString("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" });
}

/** Compact relative-ish label for list rows. */
export function fmtShort(d: Date): string {
  return d.toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function initials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

/** "Re: foo" — avoid stacking multiple "Re:" prefixes. */
export function replySubject(subject: string): string {
  return /^re:/i.test(subject.trim()) ? subject : `Re: ${subject}`;
}
