import { z } from "zod";
import { PaymentGateway } from "@prisma/client";

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

export const gatewayInitiateSchema = z.object({
  invoiceId: z.string().min(1),
  gateway: z.nativeEnum(PaymentGateway),
  amount: z.preprocess(emptyToUndefined, z.coerce.number().int().positive("Enter a valid amount").max(10_000_000)),
});

export type GatewayInitiateInput = z.infer<typeof gatewayInitiateSchema>;

export function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$")) continue;
    obj[key] = value;
  }
  return obj;
}
