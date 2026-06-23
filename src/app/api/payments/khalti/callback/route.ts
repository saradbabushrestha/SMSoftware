import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getGateway } from "@/lib/payments/gateway";
import { completeTransaction, failTransaction } from "@/lib/payments/complete";

/** Khalti redirects here with ?pidx=…&status=…; we verify via lookup. */
export async function GET(req: NextRequest) {
  const pidx = req.nextUrl.searchParams.get("pidx");
  if (!pidx) return NextResponse.redirect(new URL("/dashboard/fees?payment=error", req.url));

  const txn = await db.paymentTransaction.findFirst({ where: { reference: pidx, gateway: "KHALTI" } });
  if (!txn) return NextResponse.redirect(new URL("/dashboard/fees?payment=error", req.url));

  const back = (q: string) => NextResponse.redirect(new URL(`/dashboard/fees/${txn.invoiceId}?payment=${q}`, req.url));

  const gw = getGateway("KHALTI");
  let inquiry: Record<string, unknown>;
  try {
    inquiry = await gw.inquiry(pidx);
  } catch {
    return back("error");
  }

  if (gw.isSuccess(inquiry) && gw.requestedAmount(inquiry) >= txn.amount) {
    const ref = typeof inquiry.transaction_id === "string" ? inquiry.transaction_id : undefined;
    await completeTransaction(txn.id, "KHALTI", ref);
    return back("success");
  }

  // Pending/Initiated stay open; anything terminal is a failure.
  if (inquiry.status !== "Pending" && inquiry.status !== "Initiated") await failTransaction(txn.id);
  return back("failed");
}
