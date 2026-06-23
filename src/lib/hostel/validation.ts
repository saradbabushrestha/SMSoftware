import { z } from "zod";
import { HostelType } from "@prisma/client";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const optionalString = z.preprocess(emptyToUndefined, z.string().trim().optional());

export const roomSchema = z.object({
  block: z.string().trim().min(1, "Block is required").max(60),
  number: z.string().trim().min(1, "Room number is required").max(20),
  gender: z.nativeEnum(HostelType).default("MIXED"),
  capacity: z.preprocess(emptyToUndefined, z.coerce.number().int("Whole number").min(1).max(50).default(2)),
  wardenName: optionalString,
  notes: optionalString,
});

export const assignSchema = z.object({
  studentId: z.string().min(1, "Select a student"),
  bedNumber: optionalString,
});

export type RoomInput = z.infer<typeof roomSchema>;

export function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$")) continue;
    obj[key] = value;
  }
  return obj;
}
