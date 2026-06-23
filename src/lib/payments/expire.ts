import { db } from "@/lib/db";

/**
 * Mark abandoned gateway checkouts as FAILED: any PaymentTransaction still
 * PENDING after `minutes` (the user never returned from the gateway, or the
 * callback never fired). Safe to run repeatedly (idempotent). Returns the count
 * transitioned. Intended to run on a schedule — see scripts/expire-transactions.ts.
 */
export async function expireStalePaymentTransactions(minutes = 30): Promise<number> {
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);
  const res = await db.paymentTransaction.updateMany({
    where: { status: "PENDING", createdAt: { lt: cutoff } },
    data: { status: "FAILED" },
  });
  return res.count;
}
