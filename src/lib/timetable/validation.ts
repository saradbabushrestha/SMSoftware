import { z } from "zod";
import { Weekday } from "@prisma/client";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const optionalString = z.preprocess(emptyToUndefined, z.string().trim().optional());
const teacherToUndefined = (v: unknown) => (v === "" || v === "none" || v == null ? undefined : v);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm (24h)");

export const entrySchema = z
  .object({
    sectionId: z.string().min(1, "Select a section"),
    subjectId: z.string().min(1, "Select a subject"),
    teacherId: z.preprocess(teacherToUndefined, z.string().optional()),
    day: z.nativeEnum(Weekday),
    startTime: time,
    endTime: time,
    room: optionalString,
  })
  .refine((d) => d.endTime > d.startTime, { message: "End time must be after start time", path: ["endTime"] });

export type EntryInput = z.infer<typeof entrySchema>;

export function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$")) continue;
    obj[key] = value;
  }
  return obj;
}
