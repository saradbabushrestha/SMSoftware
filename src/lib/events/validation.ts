import { z } from "zod";
import { EventType } from "@prisma/client";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const optionalString = z.preprocess(emptyToUndefined, z.string().trim().optional());

export const eventSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(160),
    type: z.nativeEnum(EventType).default("GENERAL"),
    description: optionalString,
    location: optionalString,
    startsAt: z.coerce.date({ message: "Start date & time is required" }),
    endsAt: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
    capacity: z.preprocess(emptyToUndefined, z.coerce.number().int("Whole number").min(0).max(100000).default(0)),
  })
  .refine((d) => !d.endsAt || d.endsAt >= d.startsAt, { message: "End must be after start", path: ["endsAt"] });

export type EventInput = z.infer<typeof eventSchema>;

export function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$")) continue;
    obj[key] = value;
  }
  return obj;
}
