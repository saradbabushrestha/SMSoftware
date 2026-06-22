import { z } from "zod";
import { FeeCategory, PaymentMethod } from "@prisma/client";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const optionalString = z.preprocess(emptyToUndefined, z.string().trim().optional());

export const invoiceSchema = z.object({
  studentId: z.string().min(1, "Select a student"),
  category: z.nativeEnum(FeeCategory).default("TUITION"),
  title: z.string().trim().min(1, "Title is required").max(120),
  amount: z.preprocess(emptyToUndefined, z.coerce.number().positive("Amount must be greater than 0").max(10_000_000)),
  dueDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  note: optionalString,
});

export const paymentSchema = z.object({
  amount: z.preprocess(emptyToUndefined, z.coerce.number().positive("Amount must be greater than 0").max(10_000_000)),
  method: z.nativeEnum(PaymentMethod).default("ESEWA"),
  reference: optionalString,
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;

export function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$")) continue;
    obj[key] = value;
  }
  return obj;
}
