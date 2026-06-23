import { z } from "zod";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

export const submissionSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160),
  category: z.string().trim().min(1, "Category is required").max(60),
  period: z.preprocess(emptyToUndefined, z.string().trim().max(80).optional()),
  summary: z.string().trim().min(1, "Summary is required").max(5000),
});

export type SubmissionInput = z.infer<typeof submissionSchema>;

export function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$")) continue;
    obj[key] = value;
  }
  return obj;
}
