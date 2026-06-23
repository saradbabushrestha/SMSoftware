import "server-only";
import { Prisma, type LedgerType } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/types";

const PAGE_SIZE = 12;

function scope(user: SessionUser): Prisma.LedgerEntryWhereInput {
  return user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {};
}

export interface ListLedgerParams {
  type?: LedgerType;
  from?: Date;
  to?: Date;
  page?: number;
}

function buildWhere(user: SessionUser, params: ListLedgerParams): Prisma.LedgerEntryWhereInput {
  const where: Prisma.LedgerEntryWhereInput = { deletedAt: null, ...scope(user) };
  if (params.type) where.type = params.type;
  if (params.from || params.to) {
    where.date = {};
    if (params.from) where.date.gte = params.from;
    if (params.to) where.date.lte = params.to;
  }
  return where;
}

export async function listLedger(user: SessionUser, params: ListLedgerParams) {
  const page = Math.max(1, params.page ?? 1);
  const where = buildWhere(user, params);

  const [rows, total] = await Promise.all([
    db.ledgerEntry.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.ledgerEntry.count({ where }),
  ]);
  return { rows, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** Income / expense / net P&L over the same filter window (ignores pagination). */
export async function getLedgerStats(user: SessionUser, params: Omit<ListLedgerParams, "page" | "type"> = {}) {
  const base = buildWhere(user, params);
  const [income, expense] = await Promise.all([
    db.ledgerEntry.aggregate({ where: { ...base, type: "INCOME" }, _sum: { amount: true } }),
    db.ledgerEntry.aggregate({ where: { ...base, type: "EXPENSE" }, _sum: { amount: true } }),
  ]);
  const totalIncome = income._sum.amount ?? 0;
  const totalExpense = expense._sum.amount ?? 0;
  return { income: totalIncome, expense: totalExpense, net: totalIncome - totalExpense };
}

export async function getLedgerEntry(user: SessionUser, id: string) {
  return db.ledgerEntry.findFirst({ where: { id, deletedAt: null, ...scope(user) } });
}
