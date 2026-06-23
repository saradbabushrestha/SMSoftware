"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/rbac/authorize";
import { gatewayInitiateSchema, formToObject } from "@/lib/payments/validation";

type SessionUserT = Awaited<ReturnType<typeof requireUser>>;

function feeScope(user: SessionUserT) {
  return user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {};
}

async function guardianChildIds(userId: string): Promise<string[]> {
  const g = await db.guardian.findFirst({
    where: { userId, deletedAt: null },
    include: { students: { select: { studentId: true } } },
  });
  return g?.students.map((s) => s.studentId) ?? [];
}

/**
 * Validate the request and create a PENDING PaymentTransaction, then hand off to
 * the gateway's `/pay` route (which uses the gateway class to build the form or
 * hosted-checkout redirect). Confirmation happens only on the verified callback.
 */
export async function initiateGatewayPaymentAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "payment:make") && !can(user, "payment:manage")) {
    redirect("/dashboard/fees?payment=denied");
  }

  const parsed = gatewayInitiateSchema.safeParse(formToObject(formData));
  if (!parsed.success) redirect("/dashboard/fees?payment=invalid");
  const { invoiceId, gateway, amount } = parsed.data;

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, deletedAt: null, ...feeScope(user) },
    include: { payments: { select: { amount: true } } },
  });
  if (!invoice) redirect("/dashboard/fees?payment=notfound");

  if (!can(user, "payment:manage")) {
    const childIds = await guardianChildIds(user.id);
    if (!childIds.includes(invoice.studentId)) redirect(`/dashboard/fees/${invoiceId}?payment=denied`);
  }

  if (invoice.status === "CANCELLED") redirect(`/dashboard/fees/${invoiceId}?payment=cancelled`);
  const paid = invoice.payments.reduce((a, p) => a + p.amount, 0);
  const balance = Math.max(0, Math.round(invoice.amount - paid));
  if (balance <= 0) redirect(`/dashboard/fees/${invoiceId}?payment=settled`);

  const pay = Math.min(amount, balance);
  if (gateway === "KHALTI" && pay < 10) redirect(`/dashboard/fees/${invoiceId}?payment=min`);

  const txn = await db.paymentTransaction.create({
    data: {
      schoolId: invoice.schoolId,
      invoiceId: invoice.id,
      gateway,
      amount: pay,
      reference: crypto.randomUUID(),
      initiatedById: user.id,
    },
  });

  redirect(`/api/payments/${gateway.toLowerCase()}/pay?txn=${txn.id}`);
}
