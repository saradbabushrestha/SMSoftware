import "server-only";
import { createHmac } from "crypto";
import type { InitiateResult, PayOptions, PaymentGatewayInterface } from "@/lib/payments/gateway";

/** Minimal XML→object for Fonepay's flat verification response. */
function xmlToObject(xml: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of xml.matchAll(/<([A-Za-z0-9_]+)>([\s\S]*?)<\/\1>/g)) {
    out[m[1]] = m[2].trim();
  }
  return out;
}

/** Fonepay — sandbox defaults, overridable via env. */
export class FonepayGateway implements PaymentGatewayInterface {
  private readonly baseUrl = (process.env.FONEPAY_BASE_URL ?? "https://dev-clientapi.fonepay.com/").replace(/\/?$/, "/");
  private readonly merchantId = process.env.FONEPAY_MERCHANT_ID ?? "NBQM";
  private readonly secret = process.env.FONEPAY_SECRET_KEY ?? "";

  purchaseOrderId = "";
  purchaseOrderName = "";

  private dv(message: string): string {
    return createHmac("sha512", this.secret).update(message).digest("hex");
  }

  async pay(amount: number, returnUrl: string, purchaseOrderId: string, purchaseOrderName: string, opts?: PayOptions) {
    this.purchaseOrderId = purchaseOrderId;
    this.purchaseOrderName = purchaseOrderName;
    return this.initiate(amount, returnUrl, opts);
  }

  async initiate(amount: number, returnUrl: string, args?: PayOptions): Promise<InitiateResult> {
    const AMT = String(Math.round(amount));
    const PID = this.merchantId;
    const PRN = args?.reference ?? this.purchaseOrderId;
    const CRN = "NPR";
    const now = new Date();
    const DT = `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}/${now.getFullYear()}`;
    const R1 = this.purchaseOrderName;
    const R2 = args?.remarks ?? "Scholaris";
    const MD = "P";
    const RU = returnUrl;
    // DV signs the comma-joined VALUES in this exact order.
    const DV = this.dv([PID, MD, PRN, AMT, CRN, DT, R1, R2, RU].join(","));

    return {
      kind: "form",
      action: `${this.baseUrl}api/merchantRequest`,
      reference: PRN,
      fields: { RU, PID, PRN, AMT, CRN, DT, R1, R2, MD, DV },
    };
  }

  /** Verify a transaction via Fonepay's verificationMerchant (returns XML). */
  async inquiry(transactionId: string, args?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const PID = this.merchantId;
    const UID = transactionId;
    const PRN = String(args?.PRN ?? "");
    const BID = String(args?.BID ?? "");
    const R_AMT = String(args?.R_AMT ?? "");
    const DV = this.dv([PID, R_AMT, PRN, BID, UID].join(","));

    const url = new URL(`${this.baseUrl}api/merchantRequest/verificationMerchant`);
    for (const [k, v] of Object.entries({ PRN, PID, BID, AMT: R_AMT, UID, DV })) url.searchParams.set(k, v);

    const res = await fetch(url, { headers: { Accept: "application/xml" }, cache: "no-store" });
    const text = await res.text().catch(() => "");
    return xmlToObject(text);
  }

  isSuccess(inquiry: Record<string, unknown>): boolean {
    return String(inquiry.success ?? "").toLowerCase() === "true";
  }

  requestedAmount(inquiry: Record<string, unknown>): number {
    return Number(inquiry.amount ?? 0);
  }
}
