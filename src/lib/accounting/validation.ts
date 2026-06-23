import { z } from "zod";
import { LedgerType } from "@prisma/client";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const optionalString = z.preprocess(emptyToUndefined, z.string().trim().optional());

export const ledgerSchema = z.object({
  type: z.nativeEnum(LedgerType).default("EXPENSE"),
  category: z.string().trim().min(1, "Category is required").max(80),
  amount: z.preprocess(emptyToUndefined, z.coerce.number().positive("Amount must be greater than 0").max(100_000_000)),
  date: z.preprocess(emptyToUndefined, z.coerce.date({ error: "Date is required" })),
  description: optionalString,
});

export type LedgerInput = z.infer<typeof ledgerSchema>;

export function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$")) continue;
    obj[key] = value;
  }
  return obj;
}
