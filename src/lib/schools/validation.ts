import { z } from "zod";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const optionalString = z.preprocess(emptyToUndefined, z.string().trim().optional());

export const schoolSchema = z.object({
  name: z.string().trim().min(1, "School name is required").max(160),
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(20)
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers and hyphens only"),
  email: z.preprocess(emptyToUndefined, z.string().trim().toLowerCase().email("Enter a valid email").optional()),
  phone: optionalString,
  address: optionalString,
  city: optionalString,
  country: z.preprocess(emptyToUndefined, z.string().trim().default("Nepal")),
  timezone: z.preprocess(emptyToUndefined, z.string().trim().default("Asia/Kathmandu")),
});

export type SchoolInput = z.infer<typeof schoolSchema>;

export function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$")) continue;
    obj[key] = value;
  }
  return obj;
}
