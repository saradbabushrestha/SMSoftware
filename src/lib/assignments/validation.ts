import { z } from "zod";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const optionalString = z.preprocess(emptyToUndefined, z.string().trim().optional());

export const assignmentSchema = z.object({
  sectionId: z.string().min(1, "Select a section"),
  subjectId: z.string().min(1, "Select a subject"),
  title: z.string().trim().min(1, "Title is required").max(160),
  description: optionalString,
  dueDate: z.coerce.date({ message: "Due date is required" }),
  maxPoints: z.preprocess(emptyToUndefined, z.coerce.number().int("Whole number").min(1).max(1000).default(100)),
});

export const submitSchema = z.object({
  content: z.string().trim().min(1, "Write your submission before submitting").max(20000),
});

export const gradeSchema = z.object({
  grade: z.preprocess(emptyToUndefined, z.coerce.number().min(0)),
  feedback: optionalString,
});

export type AssignmentInput = z.infer<typeof assignmentSchema>;

export function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$")) continue;
    obj[key] = value;
  }
  return obj;
}
