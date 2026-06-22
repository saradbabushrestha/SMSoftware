import { z } from "zod";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const optionalString = z.preprocess(emptyToUndefined, z.string().trim().optional());
const teacherToUndefined = (v: unknown) => (v === "" || v === "none" || v == null ? undefined : v);

export const classSchema = z.object({
  name: z.string().trim().min(1, "Class name is required").max(80),
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(20)
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers and hyphens only"),
  stream: optionalString,
  capacity: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int("Whole number").min(1).max(2000).default(40),
  ),
});

export const sectionSchema = z.object({
  name: z.string().trim().min(1, "Section name is required").max(40),
  capacity: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int("Whole number").min(1).max(500).default(40),
  ),
  classTeacherId: z.preprocess(teacherToUndefined, z.string().optional()),
});

export type ClassInput = z.infer<typeof classSchema>;
export type SectionInput = z.infer<typeof sectionSchema>;

export function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$")) continue;
    obj[key] = value;
  }
  return obj;
}
