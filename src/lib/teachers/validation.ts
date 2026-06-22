import { z } from "zod";
import { UserStatus } from "@prisma/client";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const optionalString = z.preprocess(emptyToUndefined, z.string().trim().optional());
const optionalDate = z.preprocess(
  emptyToUndefined,
  z.coerce.date().max(new Date(), "Date can't be in the future").optional(),
);

export const teacherProfileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  phone: optionalString,
  employeeId: optionalString, // auto-generated when blank
  qualification: optionalString,
  experienceYrs: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int("Must be a whole number").min(0).max(60).optional(),
  ),
  joinedOn: optionalDate,
  // Set only for super admin (others derive school from their session).
  schoolId: optionalString,
});

export const createTeacherSchema = teacherProfileSchema.extend({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

export const updateTeacherSchema = teacherProfileSchema.extend({
  status: z.nativeEnum(UserStatus).default("ACTIVE"),
});

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;

/** Parse single-valued FormData fields into a record for zod (skips framework + multi fields). */
export function formToObject(formData: FormData, skip: string[] = []): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$") || skip.includes(key)) continue;
    obj[key] = value;
  }
  return obj;
}
