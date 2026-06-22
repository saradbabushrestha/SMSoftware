import { z } from "zod";
import { UserStatus, GuardianRelation } from "@prisma/client";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const optionalString = z.preprocess(emptyToUndefined, z.string().trim().optional());

export const guardianProfileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  phone: optionalString,
  occupation: optionalString,
  address: optionalString,
});

export const createGuardianSchema = guardianProfileSchema.extend({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

export const updateGuardianSchema = guardianProfileSchema.extend({
  status: z.nativeEnum(UserStatus).default("ACTIVE"),
});

export const linkStudentSchema = z.object({
  studentId: z.string().min(1, "Select a student"),
  relation: z.nativeEnum(GuardianRelation).default("OTHER"),
});

export type CreateGuardianInput = z.infer<typeof createGuardianSchema>;
export type UpdateGuardianInput = z.infer<typeof updateGuardianSchema>;

export function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$")) continue;
    obj[key] = value;
  }
  return obj;
}
