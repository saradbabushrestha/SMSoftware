import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getGateway } from "@/lib/payments/gateway";
import { completeTransaction, failTransaction } from "@/lib/payments/complete";

/** Fonepay redirects here with PRN/BID/UID/R_AMT/…; we verify via verificationMerchant. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ txn: string }> }) {
  const { txn: txnId } = await params;
  const sp = req.nextUrl.searchParams;
  const txn = await db.paymentTransaction.findUnique({ where: { id: txnId } });
  if (!txn) return NextResponse.redirect(new URL("/dashboard/fees?payment=error", req.url));

  const back = (q: string) => NextResponse.redirect(new URL(`/dashboard/fees/${txn.invoiceId}?payment=${q}`, req.url));

  const UID = sp.get("UID") ?? "";
  const PRN = sp.get("PRN") ?? txn.reference;
  const BID = sp.get("BID") ?? "";
  const R_AMT = sp.get("R_AMT") ?? String(Math.round(txn.amount));
  if (!UID) {
    await failTransaction(txn.id);
    return back("failed");
  }

  const gw = getGateway("FONEPAY");
  let inquiry: Record<string, unknown>;
  try {
    inquiry = await gw.inquiry(UID, { PRN, BID, R_AMT });
  } catch {
    return back("error");
  }

  if (gw.isSuccess(inquiry) && gw.requestedAmount(inquiry) >= txn.amount) {
    await completeTransaction(txn.id, "FONEPAY", UID);
    return back("success");
  }

  await failTransaction(txn.id);
  return back("failed");
}
