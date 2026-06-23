import { z } from "zod";
import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

export const subscriptionSchema = z.object({
  plan: z.nativeEnum(SubscriptionPlan).default("TRIAL"),
  status: z.nativeEnum(SubscriptionStatus).default("TRIALING"),
  seats: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1, "At least 1 seat").max(100_000)),
  priceNpr: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0, "Cannot be negative").max(1_000_000_000)),
  renewsAt: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  note: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
});

export type SubscriptionInput = z.infer<typeof subscriptionSchema>;

export function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$")) continue;
    obj[key] = value;
  }
  return obj;
}
