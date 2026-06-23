import "server-only";
import type { InitiateResult, PayOptions, PaymentGatewayInterface } from "@/lib/payments/gateway";

/** Khalti ePayment (KPG-2) — sandbox defaults, overridable via env. */
export class KhaltiGateway implements PaymentGatewayInterface {
  private readonly baseUrl = (process.env.KHALTI_BASE_URL ?? "https://dev.khalti.com/api/v2").replace(/\/$/, "");
  private readonly secret = process.env.KHALTI_SECRET_KEY ?? "live_secret_key_68791341fdd94846a146f0457ff7b455";

  purchaseOrderId = "";
  purchaseOrderName = "";

  private headers() {
    return { Authorization: `Key ${this.secret}`, "Content-Type": "application/json" };
  }

  async pay(amount: number, returnUrl: string, purchaseOrderId: string, purchaseOrderName: string, opts?: PayOptions) {
    this.purchaseOrderId = purchaseOrderId;
    this.purchaseOrderName = purchaseOrderName;
    return this.initiate(amount, returnUrl, opts);
  }

  async initiate(amount: number, returnUrl: string, args?: PayOptions): Promise<InitiateResult> {
    const websiteUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const res = await fetch(`${this.baseUrl}/epayment/initiate/`, {
      method: "POST",
      headers: this.headers(),
      cache: "no-store",
      body: JSON.stringify({
        return_url: returnUrl,
        website_url: websiteUrl,
        amount: Math.round(amount) * 100, // paisa
        purchase_order_id: this.purchaseOrderId,
        purchase_order_name: this.purchaseOrderName,
        customer_info: {
          name: args?.customer?.name,
          email: args?.customer?.email,
          phone: args?.customer?.phone,
        },
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Khalti initiate failed (${res.status}): ${detail}`);
    }
    const body = (await res.json()) as { pidx: string; payment_url: string };
    return { kind: "redirect", url: body.payment_url, reference: body.pidx };
  }

  async inquiry(transactionId: string): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}/epayment/lookup/`, {
      method: "POST",
      headers: this.headers(),
      cache: "no-store",
      body: JSON.stringify({ pidx: transactionId }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Khalti lookup failed (${res.status}): ${detail}`);
    }
    return (await res.json()) as Record<string, unknown>;
  }

  isSuccess(inquiry: Record<string, unknown>): boolean {
    return inquiry.status === "Completed";
  }

  /** Khalti reports paisa; convert back to NPR. */
  requestedAmount(inquiry: Record<string, unknown>): number {
    return Number(inquiry.total_amount ?? 0) / 100;
  }
}
