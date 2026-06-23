import type { EventType } from "@prisma/client";

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  GENERAL: "General",
  SPORTS: "Sports",
  COMPETITION: "Competition",
  WORKSHOP: "Workshop",
  MEETING: "Meeting",
  HOLIDAY: "Holiday",
};

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "info" | "outline";

export const EVENT_TYPE_VARIANT: Record<EventType, BadgeVariant> = {
  GENERAL: "secondary",
  SPORTS: "success",
  COMPETITION: "info",
  WORKSHOP: "warning",
  MEETING: "default",
  HOLIDAY: "destructive",
};

export const EVENT_TYPE_OPTIONS = Object.keys(EVENT_TYPE_LABELS) as EventType[];

export function isPast(startsAt: Date): boolean {
  return startsAt.getTime() < Date.now();
}

export function formatEventWhen(startsAt: Date, endsAt: Date | null): string {
  const date = startsAt.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const time = startsAt.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" });
  if (endsAt) {
    const sameDay = startsAt.toDateString() === endsAt.toDateString();
    const endTime = endsAt.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" });
    return sameDay ? `${date} · ${time} – ${endTime}` : `${date} ${time} → ${endsAt.toLocaleDateString("en", { month: "short", day: "numeric" })}`;
  }
  return `${date} · ${time}`;
}

export function capacityLabel(registered: number, capacity: number): string {
  return capacity > 0 ? `${registered}/${capacity}` : `${registered}`;
}

export function isFull(registered: number, capacity: number): boolean {
  return capacity > 0 && registered >= capacity;
}
