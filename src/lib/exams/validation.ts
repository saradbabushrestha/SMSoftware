import { z } from "zod";
import { ExamType } from "@prisma/client";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

export const examSchema = z.object({
  name: z.string().trim().min(1, "Exam name is required").max(120),
  type: z.nativeEnum(ExamType).default("MIDTERM"),
  classId: z.string().min(1, "Select a class"),
  maxMarks: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int("Whole number").min(1).max(1000).default(100),
  ),
  examDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
});

export type ExamInput = z.infer<typeof examSchema>;

export function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$")) continue;
    obj[key] = value;
  }
  return obj;
}
