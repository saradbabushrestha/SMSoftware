import { z } from "zod";
import { UserRole, UserStatus } from "@prisma/client";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const optionalString = z.preprocess(emptyToUndefined, z.string().trim().optional());

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  phone: optionalString,
  role: z.nativeEnum(UserRole),
});

export const updateUserSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  phone: optionalString,
  status: z.nativeEnum(UserStatus).default("ACTIVE"),
  role: z.preprocess(emptyToUndefined, z.nativeEnum(UserRole).optional()),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$")) continue;
    obj[key] = value;
  }
  return obj;
}
