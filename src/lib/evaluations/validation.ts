import { z } from "zod";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const rating = z.preprocess(emptyToUndefined, z.coerce.number().int().min(1, "Rate 1–5").max(5, "Rate 1–5"));

export const evaluationSchema = z.object({
  period: z.string().trim().min(1, "Period is required").max(80),
  teaching: rating,
  classroom: rating,
  collaboration: rating,
  punctuality: rating,
  comment: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
});

export type EvaluationInput = z.infer<typeof evaluationSchema>;

export function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$")) continue;
    obj[key] = value;
  }
  return obj;
}
