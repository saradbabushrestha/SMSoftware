import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getGateway } from "@/lib/payments/gateway";
import { decodeEsewaData } from "@/lib/payments/gateways/esewa";
import { completeTransaction, failTransaction } from "@/lib/payments/complete";

/** eSewa redirects here after checkout (success → `?data=<base64>`). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ txn: string }> }) {
  const { txn: txnId } = await params;
  const sp = req.nextUrl.searchParams;
  const txn = await db.paymentTransaction.findUnique({ where: { id: txnId } });
  if (!txn) return NextResponse.redirect(new URL("/dashboard/fees?payment=error", req.url));

  const back = (q: string) => NextResponse.redirect(new URL(`/dashboard/fees/${txn.invoiceId}?payment=${q}`, req.url));

  const dataParam = sp.get("data");
  if (sp.get("status") === "failed" || !dataParam) {
    await failTransaction(txn.id);
    return back("failed");
  }

  const data = decodeEsewaData(dataParam);
  if (!data || data.transaction_uuid !== txn.reference) {
    await failTransaction(txn.id);
    return back("failed");
  }

  // Authoritative server-to-server confirmation via the gateway interface.
  const gw = getGateway("ESEWA");
  const inquiry = await gw.inquiry(txn.reference, { total_amount: txn.amount });
  if (gw.isSuccess(inquiry) && gw.requestedAmount(inquiry) >= txn.amount) {
    await completeTransaction(txn.id, "ESEWA", typeof data.transaction_code === "string" ? data.transaction_code : undefined);
    return back("success");
  }

  await failTransaction(txn.id);
  return back("failed");
}
