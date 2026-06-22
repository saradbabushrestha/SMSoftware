import { z } from "zod";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const classToUndefined = (v: unknown) => (v === "" || v === "none" || v == null ? undefined : v);

export const subjectSchema = z.object({
  name: z.string().trim().min(1, "Subject name is required").max(100),
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(20)
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers and hyphens only"),
  credits: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int("Whole number").min(0).max(20).default(1),
  ),
  classId: z.preprocess(classToUndefined, z.string().optional()),
});

export type SubjectInput = z.infer<typeof subjectSchema>;

export function formToObject(formData: FormData, skip: string[] = []): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$") || skip.includes(key)) continue;
    obj[key] = value;
  }
  return obj;
}
