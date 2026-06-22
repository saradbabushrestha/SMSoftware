import { z } from "zod";
import { Gender, BloodGroup, EnrollmentStatus } from "@prisma/client";

/** Treat empty-string form fields as "not provided". */
const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

/** Section select uses the sentinel "none" for "unassigned". */
const sectionToUndefined = (v: unknown) => (v === "" || v === "none" || v == null ? undefined : v);

const optionalString = z.preprocess(emptyToUndefined, z.string().trim().optional());
const optionalDate = z.preprocess(
  emptyToUndefined,
  z.coerce.date().max(new Date(), "Date can't be in the future").optional(),
);

export const studentProfileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  phone: optionalString,
  gender: z.nativeEnum(Gender).default("UNDISCLOSED"),
  dateOfBirth: optionalDate,
  bloodGroup: z.nativeEnum(BloodGroup).default("UNKNOWN"),
  nationality: z.preprocess(emptyToUndefined, z.string().trim().default("Nepali")),
  address: optionalString,
  admissionNumber: optionalString, // auto-generated when blank
  rollNumber: optionalString,
  sectionId: z.preprocess(sectionToUndefined, z.string().optional()), // class/section placement
});

export const createStudentSchema = studentProfileSchema.extend({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

export const updateStudentSchema = studentProfileSchema.extend({
  status: z.nativeEnum(EnrollmentStatus).default("ACTIVE"),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;

/** Parse a FormData object into a plain record for zod. */
export function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$")) continue; // skip framework fields
    obj[key] = value;
  }
  return obj;
}
