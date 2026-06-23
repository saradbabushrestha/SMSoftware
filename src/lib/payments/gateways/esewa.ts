import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import type { InitiateResult, PayOptions, PaymentGatewayInterface } from "@/lib/payments/gateway";

/** eSewa ePay v2 — UAT defaults, overridable via env for production. */
export class EsewaGateway implements PaymentGatewayInterface {
  private readonly productCode = process.env.ESEWA_PRODUCT_CODE ?? "EPAYTEST";
  private readonly secret = process.env.ESEWA_SECRET_KEY ?? "8gBm/:&EnhH.1/q";
  private readonly formUrl = process.env.ESEWA_FORM_URL ?? "https://rc-epay.esewa.com.np/api/epay/main/v2/form";
  private readonly statusUrl = process.env.ESEWA_STATUS_URL ?? "https://rc.esewa.com.np/api/epay/transaction/status/";

  purchaseOrderId = "";
  purchaseOrderName = "";

  private sign(message: string): string {
    return createHmac("sha256", this.secret).update(message).digest("base64");
  }

  async pay(amount: number, returnUrl: string, purchaseOrderId: string, purchaseOrderName: string, opts?: PayOptions) {
    this.purchaseOrderId = purchaseOrderId;
    this.purchaseOrderName = purchaseOrderName;
    return this.initiate(amount, returnUrl, opts);
  }

  async initiate(amount: number, returnUrl: string, args?: PayOptions): Promise<InitiateResult> {
    const total = String(Math.round(amount));
    const transactionUuid = args?.reference ?? randomUUID();
    const failureUrl = args?.failureUrl ?? `${returnUrl}?status=failed`;
    const signature = this.sign(
      `total_amount=${total},transaction_uuid=${transactionUuid},product_code=${this.productCode}`,
    );
    return {
      kind: "form",
      action: this.formUrl,
      reference: transactionUuid,
      fields: {
        amount: total,
        tax_amount: "0",
        total_amount: total,
        transaction_uuid: transactionUuid,
        product_code: this.productCode,
        product_service_charge: "0",
        product_delivery_charge: "0",
        success_url: returnUrl,
        failure_url: failureUrl,
        signed_field_names: "total_amount,transaction_uuid,product_code",
        signature,
      },
    };
  }

  /** Authoritative status check (don't trust the redirect payload alone). */
  async inquiry(transactionId: string, args?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const totalAmount = args?.total_amount;
    if (totalAmount === undefined || totalAmount === null) throw new Error("total_amount is required");
    const url = new URL(this.statusUrl);
    url.searchParams.set("product_code", this.productCode);
    url.searchParams.set("transaction_uuid", transactionId);
    url.searchParams.set("total_amount", String(Math.round(Number(totalAmount))));
    const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) return { status: "NOT_FOUND" };
    return (await res.json()) as Record<string, unknown>;
  }

  isSuccess(inquiry: Record<string, unknown>): boolean {
    return inquiry.status === "COMPLETE";
  }

  requestedAmount(inquiry: Record<string, unknown>): number {
    return Number(inquiry.total_amount ?? 0);
  }

  /** Verify the base64 success payload's HMAC signature (defence-in-depth). */
  verifyResponseSignature(res: Record<string, unknown>): boolean {
    const names = typeof res.signed_field_names === "string" ? res.signed_field_names : "";
    const sig = typeof res.signature === "string" ? res.signature : "";
    if (!names || !sig) return false;
    const message = names
      .split(",")
      .map((f) => `${f}=${res[f] ?? ""}`)
      .join(",");
    const expected = this.sign(message);
    const a = Buffer.from(expected);
    const b = Buffer.from(sig);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}

/** Decode the base64 JSON eSewa appends to success_url (`data` query param). */
export function decodeEsewaData(base64: string): Record<string, unknown> | null {
  try {
    return JSON.parse(Buffer.from(base64, "base64").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}
