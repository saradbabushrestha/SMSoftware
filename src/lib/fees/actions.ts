"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { InvoiceStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/rbac/authorize";
import { audit } from "@/lib/audit";
import { invoiceSchema, paymentSchema, formToObject } from "@/lib/fees/validation";
import { ONLINE_METHODS } from "@/lib/fees/display";

export interface InvoiceFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export interface PaymentState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

function zodToFieldErrors(error: import("zod").ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

type SessionUserT = Awaited<ReturnType<typeof requireUser>>;

function feeScope(user: SessionUserT) {
  return user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {};
}

/** Student ids a guardian is allowed to pay for. */
async function guardianChildIds(user: SessionUserT): Promise<string[]> {
  const guardian = await db.guardian.findFirst({
    where: { userId: user.id, deletedAt: null },
    include: { students: { select: { studentId: true } } },
  });
  return guardian?.students.map((s) => s.studentId) ?? [];
}

async function recomputeInvoiceStatus(invoiceId: string) {
  const inv = await db.invoice.findUnique({ where: { id: invoiceId }, include: { payments: { select: { amount: true } } } });
  if (!inv || inv.status === "CANCELLED") return;
  const paid = inv.payments.reduce((a, p) => a + p.amount, 0);
  const status: InvoiceStatus = paid >= inv.amount ? "PAID" : paid > 0 ? "PARTIAL" : "PENDING";
  if (status !== inv.status) await db.invoice.update({ where: { id: invoiceId }, data: { status } });
}

export async function createInvoiceAction(_prev: InvoiceFormState, formData: FormData): Promise<InvoiceFormState> {
  const user = await requireUser();
  if (!can(user, "fee:manage")) return { error: "You don't have permission to manage fees." };

  const parsed = invoiceSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const data = parsed.data;

  const student = await db.student.findFirst({ where: { id: data.studentId, deletedAt: null, ...feeScope(user) } });
  if (!student) return { fieldErrors: { studentId: "Select a valid student." } };

  const invoice = await db.invoice.create({
    data: {
      schoolId: student.schoolId,
      studentId: student.id,
      category: data.category,
      title: data.title,
      amount: data.amount,
      dueDate: data.dueDate,
      note: data.note,
    },
  });
  await audit({ action: "invoice.create", userId: user.id, schoolId: student.schoolId, entityType: "Invoice", entityId: invoice.id, metadata: { amount: data.amount } });

  revalidatePath("/dashboard/fees");
  redirect(`/dashboard/fees/${invoice.id}`);
}

export async function updateInvoiceAction(_prev: InvoiceFormState, formData: FormData): Promise<InvoiceFormState> {
  const user = await requireUser();
  if (!can(user, "fee:manage")) return { error: "You don't have permission to manage fees." };

  const id = String(formData.get("id") ?? "");
  const existing = await db.invoice.findFirst({ where: { id, deletedAt: null, ...feeScope(user) } });
  if (!existing) return { error: "Invoice not found." };

  const parsed = invoiceSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const data = parsed.data;

  await db.invoice.update({
    where: { id },
    data: { category: data.category, title: data.title, amount: data.amount, dueDate: data.dueDate, note: data.note },
  });
  await recomputeInvoiceStatus(id);
  await audit({ action: "invoice.update", userId: user.id, schoolId: existing.schoolId, entityType: "Invoice", entityId: id });

  revalidatePath("/dashboard/fees");
  revalidatePath(`/dashboard/fees/${id}`);
  redirect(`/dashboard/fees/${id}`);
}

export async function deleteInvoiceAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "fee:manage")) return;

  const id = String(formData.get("id") ?? "");
  const existing = await db.invoice.findFirst({ where: { id, deletedAt: null, ...feeScope(user) } });
  if (!existing) return;

  await db.invoice.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ action: "invoice.delete", userId: user.id, schoolId: existing.schoolId, entityType: "Invoice", entityId: id });

  revalidatePath("/dashboard/fees");
  redirect("/dashboard/fees");
}

export async function recordPaymentAction(_prev: PaymentState, formData: FormData): Promise<PaymentState> {
  const user = await requireUser();
  const canManage = can(user, "payment:manage");
  const canMake = can(user, "payment:make");
  if (!canManage && !canMake) return { error: "You don't have permission to make payments." };

  const invoiceId = String(formData.get("invoiceId") ?? "");
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, deletedAt: null, ...feeScope(user) },
    include: { payments: { select: { amount: true } } },
  });
  if (!invoice) return { error: "Invoice not found." };

  // Parents may only pay for their own children.
  if (!canManage) {
    const childIds = await guardianChildIds(user);
    if (!childIds.includes(invoice.studentId)) return { error: "You can only pay your own children's invoices." };
  }

  if (invoice.status === "CANCELLED") return { error: "This invoice has been cancelled." };
  const paid = invoice.payments.reduce((a, p) => a + p.amount, 0);
  const balance = Math.max(0, invoice.amount - paid);
  if (balance <= 0) return { error: "This invoice is already fully paid." };

  const parsed = paymentSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const data = parsed.data;
  if (data.amount > balance + 0.001) return { fieldErrors: { amount: `Amount exceeds the balance (${balance}).` } };

  // Simulate a gateway transaction reference for online (Nepal) methods.
  const reference =
    data.reference ||
    (ONLINE_METHODS.includes(data.method)
      ? `${data.method}-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 9000 + 1000)}`
      : undefined);

  await db.payment.create({
    data: {
      schoolId: invoice.schoolId,
      invoiceId: invoice.id,
      amount: data.amount,
      method: data.method,
      reference,
      recordedById: user.id,
    },
  });
  await recomputeInvoiceStatus(invoice.id);
  await audit({ action: "payment.record", userId: user.id, schoolId: invoice.schoolId, entityType: "Invoice", entityId: invoice.id, metadata: { amount: data.amount, method: data.method } });

  revalidatePath(`/dashboard/fees/${invoice.id}`);
  revalidatePath("/dashboard/fees");
  revalidatePath("/dashboard/payments");
  return { ok: true };
}
