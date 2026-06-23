import { z } from "zod";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const money = z.preprocess(emptyToUndefined, z.coerce.number().min(0).max(100_000_000).default(0));

export const payrollSchema = z.object({
  teacherId: z.string().min(1, "Select a teacher"),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM"),
  basicSalary: z.preprocess(emptyToUndefined, z.coerce.number().positive("Basic salary must be greater than 0").max(100_000_000)),
  allowances: money,
  deductions: money,
  tax: money,
  note: z.preprocess(emptyToUndefined, z.string().trim().optional()),
});

export type PayrollInput = z.infer<typeof payrollSchema>;

export function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$")) continue;
    obj[key] = value;
  }
  return obj;
}
