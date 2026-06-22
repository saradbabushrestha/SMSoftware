import "server-only";
import { Prisma, type InvoiceStatus, type FeeCategory, type PaymentMethod } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/types";

const PAGE_SIZE = 10;

function invoiceScope(user: SessionUser): Prisma.InvoiceWhereInput {
  const base: Prisma.InvoiceWhereInput = { deletedAt: null };
  if (user.role !== "SUPER_ADMIN") base.schoolId = user.schoolId ?? "__none__";
  return base;
}

export interface ListInvoicesParams {
  q?: string;
  status?: string; // InvoiceStatus or "OVERDUE"
  category?: FeeCategory;
  page?: number;
  studentIds?: string[]; // restrict to a student / set of children
}

const invoiceInclude = {
  student: { include: { user: true } },
  payments: { select: { amount: true } },
} satisfies Prisma.InvoiceInclude;

export async function listInvoices(user: SessionUser, params: ListInvoicesParams) {
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.InvoiceWhereInput = { ...invoiceScope(user) };

  if (params.studentIds) where.studentId = { in: params.studentIds };
  if (params.category) where.category = params.category;
  if (params.status === "OVERDUE") {
    where.status = { in: ["PENDING", "PARTIAL"] };
    where.dueDate = { lt: new Date() };
  } else if (params.status && ["PENDING", "PARTIAL", "PAID", "CANCELLED"].includes(params.status)) {
    where.status = params.status as InvoiceStatus;
  }
  if (params.q) {
    const q = params.q.trim();
    where.student = {
      OR: [
        { admissionNumber: { contains: q, mode: "insensitive" } },
        { user: { firstName: { contains: q, mode: "insensitive" } } },
        { user: { lastName: { contains: q, mode: "insensitive" } } },
      ],
    };
  }

  const [raw, total] = await Promise.all([
    db.invoice.findMany({
      where,
      include: invoiceInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.invoice.count({ where }),
  ]);

  const rows = raw.map((inv) => {
    const paid = inv.payments.reduce((a, p) => a + p.amount, 0);
    return { ...inv, paid, balance: Math.max(0, inv.amount - paid) };
  });

  return { rows, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getInvoiceStats(user: SessionUser, studentIds?: string[]) {
  const where: Prisma.InvoiceWhereInput = { ...invoiceScope(user) };
  if (studentIds) where.studentId = { in: studentIds };

  const [billed, collected, overdue] = await Promise.all([
    db.invoice.aggregate({ where: { ...where, status: { not: "CANCELLED" } }, _sum: { amount: true } }),
    db.payment.aggregate({
      where: { invoice: where },
      _sum: { amount: true },
    }),
    db.invoice.count({ where: { ...where, status: { in: ["PENDING", "PARTIAL"] }, dueDate: { lt: new Date() } } }),
  ]);

  const billedTotal = billed._sum.amount ?? 0;
  const collectedTotal = collected._sum.amount ?? 0;
  return {
    billed: billedTotal,
    collected: collectedTotal,
    outstanding: Math.max(0, billedTotal - collectedTotal),
    overdue,
  };
}

export async function getInvoice(user: SessionUser, id: string, studentIds?: string[]) {
  const where: Prisma.InvoiceWhereInput = { id, ...invoiceScope(user) };
  if (studentIds) where.studentId = { in: studentIds };

  const invoice = await db.invoice.findFirst({
    where,
    include: {
      student: { include: { user: true } },
      school: true,
      payments: { include: { recordedBy: { select: { firstName: true, lastName: true } } }, orderBy: { paidAt: "desc" } },
    },
  });
  if (!invoice) return null;
  const paid = invoice.payments.reduce((a, p) => a + p.amount, 0);
  return { ...invoice, paid, balance: Math.max(0, invoice.amount - paid) };
}

export async function getInvoiceFormData(user: SessionUser) {
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const where: Prisma.StudentWhereInput = { deletedAt: null };
  if (!isSuperAdmin) where.schoolId = user.schoolId ?? "__none__";
  const students = await db.student.findMany({
    where,
    include: { user: true, school: { select: { name: true } } },
    orderBy: { user: { firstName: "asc" } },
    take: 500,
  });
  return {
    isSuperAdmin,
    students: students.map((s) => ({
      id: s.id,
      label: `${s.user.firstName} ${s.user.lastName} · ${s.admissionNumber}${isSuperAdmin ? ` · ${s.school.name}` : ""}`,
    })),
  };
}

export interface ListPaymentsParams {
  method?: PaymentMethod;
  page?: number;
  studentIds?: string[];
}

export async function listPayments(user: SessionUser, params: ListPaymentsParams) {
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.PaymentWhereInput = {};
  if (user.role !== "SUPER_ADMIN") where.schoolId = user.schoolId ?? "__none__";
  if (params.method) where.method = params.method;
  if (params.studentIds) where.invoice = { studentId: { in: params.studentIds } };

  const [rows, total, sum] = await Promise.all([
    db.payment.findMany({
      where,
      include: { invoice: { include: { student: { include: { user: true } } } }, recordedBy: { select: { firstName: true, lastName: true } } },
      orderBy: { paidAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.payment.count({ where }),
    db.payment.aggregate({ where, _sum: { amount: true } }),
  ]);

  return { rows, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)), collected: sum._sum.amount ?? 0 };
}
