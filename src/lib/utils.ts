import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names and resolve Tailwind conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Build display initials from a name (max 2 chars). */
export function initials(first?: string | null, last?: string | null) {
  const a = (first ?? "").trim();
  const b = (last ?? "").trim();
  return `${a[0] ?? ""}${b[0] ?? ""}`.toUpperCase() || "?";
}

/** Format a number compactly (1.2k, 3.4M). */
export function compactNumber(n: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}
