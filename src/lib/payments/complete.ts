import "server-only";
import type { PaymentGateway, InvoiceStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

/** Recompute an invoice's status from its payments (mirrors the fees module). */
async function recomputeInvoiceStatus(invoiceId: string) {
  const inv = await db.invoice.findUnique({ where: { id: invoiceId }, include: { payments: { select: { amount: true } } } });
  if (!inv || inv.status === "CANCELLED") return;
  const paid = inv.payments.reduce((a, p) => a + p.amount, 0);
  const status: InvoiceStatus = paid >= inv.amount ? "PAID" : paid > 0 ? "PARTIAL" : "PENDING";
  if (status !== inv.status) await db.invoice.update({ where: { id: invoiceId }, data: { status } });
}

/**
 * Confirm a verified gateway transaction: atomically flip PENDING→COMPLETED
 * (so a replayed callback can't double-charge), create the Payment, link it,
 * and recompute the invoice. Idempotent: a second call is a no-op.
 */
export async function completeTransaction(transactionId: string, gateway: PaymentGateway, gatewayRef?: string) {
  const txn = await db.paymentTransaction.findUnique({ where: { id: transactionId } });
  if (!txn) return { ok: false as const, reason: "not_found" };
  if (txn.status === "COMPLETED") return { ok: true as const, alreadyDone: true, invoiceId: txn.invoiceId };

  // Claim the transaction; only one caller wins the PENDING→COMPLETED flip.
  const claim = await db.paymentTransaction.updateMany({
    where: { id: transactionId, status: "PENDING" },
    data: { status: "COMPLETED", gatewayRef: gatewayRef ?? null },
  });
  if (claim.count === 0) return { ok: true as const, alreadyDone: true, invoiceId: txn.invoiceId };

  const payment = await db.payment.create({
    data: {
      schoolId: txn.schoolId,
      invoiceId: txn.invoiceId,
      amount: txn.amount,
      method: gateway, // PaymentMethod ESEWA / KHALTI
      reference: gatewayRef ?? txn.reference,
      recordedById: txn.initiatedById ?? undefined,
    },
  });
  await db.paymentTransaction.update({ where: { id: transactionId }, data: { paymentId: payment.id } });
  await recomputeInvoiceStatus(txn.invoiceId);
  await audit({
    action: "payment.gateway",
    userId: txn.initiatedById ?? undefined,
    schoolId: txn.schoolId,
    entityType: "Invoice",
    entityId: txn.invoiceId,
    metadata: { gateway, amount: txn.amount, reference: gatewayRef ?? txn.reference },
  });
  return { ok: true as const, invoiceId: txn.invoiceId };
}

/** Mark a transaction failed/cancelled (idempotent for non-completed rows). */
export async function failTransaction(transactionId: string) {
  await db.paymentTransaction.updateMany({
    where: { id: transactionId, status: "PENDING" },
    data: { status: "FAILED" },
  });
}
