import type { HostelType } from "@prisma/client";

export const HOSTEL_TYPE_LABELS: Record<HostelType, string> = {
  BOYS: "Boys",
  GIRLS: "Girls",
  MIXED: "Mixed",
};

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "info" | "outline";

export const HOSTEL_TYPE_VARIANT: Record<HostelType, BadgeVariant> = {
  BOYS: "info",
  GIRLS: "default",
  MIXED: "secondary",
};

export const HOSTEL_TYPE_OPTIONS = Object.keys(HOSTEL_TYPE_LABELS) as HostelType[];

export function occupancyLabel(occupied: number, capacity: number): string {
  return capacity > 0 ? `${occupied}/${capacity}` : `${occupied}`;
}

export function isFull(occupied: number, capacity: number): boolean {
  return capacity > 0 && occupied >= capacity;
}
