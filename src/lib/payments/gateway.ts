import "server-only";
import type { PaymentGateway } from "@prisma/client";
import { EsewaGateway } from "@/lib/payments/gateways/esewa";
import { KhaltiGateway } from "@/lib/payments/gateways/khalti";
import { FonepayGateway } from "@/lib/payments/gateways/fonepay";

/**
 * The result of initiating a checkout. Gateway classes stay pure — they build
 * the request and return one of these; the route handler performs the actual
 * side effect (render the auto-submitting form, or HTTP-redirect to the hosted
 * checkout). `reference` is the vendor identifier to persist (eSewa
 * transaction_uuid / Khalti pidx / Fonepay PRN).
 */
export type InitiateResult =
  | { kind: "form"; action: string; fields: Record<string, string>; reference: string }
  | { kind: "redirect"; url: string; reference: string };

export interface PayOptions {
  /** Stable id to use as the gateway transaction reference (eSewa uuid / Fonepay PRN). */
  reference?: string;
  /** Where the gateway should send the user on failure/cancel (eSewa). */
  failureUrl?: string;
  /** Buyer details (Khalti requires these). */
  customer?: { name: string; email?: string; phone?: string };
  /** Extra info echoed back by the gateway (Fonepay R2 etc.). */
  remarks?: string;
}

/**
 * Contract every Nepal payment gateway must satisfy. Mirrors the canonical
 * pay / initiate / inquiry / isSuccess / requestedAmount shape so gateways are
 * interchangeable behind a single factory.
 */
export interface PaymentGatewayInterface {
  /** Accumulate order context, then initiate. */
  pay(
    amount: number,
    returnUrl: string,
    purchaseOrderId: string,
    purchaseOrderName: string,
    opts?: PayOptions,
  ): Promise<InitiateResult>;

  /** Request payment processing (build signed form / call the initiate API). */
  initiate(amount: number, returnUrl: string, args?: PayOptions): Promise<InitiateResult>;

  /** Server-to-server lookup of a transaction's authoritative state. */
  inquiry(transactionId: string, args?: Record<string, unknown>): Promise<Record<string, unknown>>;

  /** Whether the inquiry response indicates a completed payment. */
  isSuccess(inquiry: Record<string, unknown>, args?: Record<string, unknown>): boolean;

  /** The requested amount (in NPR, before vendor tax/charges) from the inquiry. */
  requestedAmount(inquiry: Record<string, unknown>, args?: Record<string, unknown>): number;
}

/** Resolve a gateway implementation by its enum name. */
export function getGateway(name: PaymentGateway): PaymentGatewayInterface {
  switch (name) {
    case "ESEWA":
      return new EsewaGateway();
    case "KHALTI":
      return new KhaltiGateway();
    case "FONEPAY":
      return new FonepayGateway();
    default:
      throw new Error(`Unsupported gateway: ${name as string}`);
  }
}
