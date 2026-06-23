import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/types";

const PAGE_SIZE = 10;

function scope(user: SessionUser): Prisma.PayrollRecordWhereInput {
  return user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {};
}

export interface ListPayrollParams {
  month?: string;
  page?: number;
}

export async function listPayroll(user: SessionUser, params: ListPayrollParams) {
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.PayrollRecordWhereInput = { ...scope(user) };
  if (params.month) where.month = params.month;

  const [rows, total] = await Promise.all([
    db.payrollRecord.findMany({
      where,
      include: { teacher: { include: { user: true } } },
      orderBy: [{ month: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.payrollRecord.count({ where }),
  ]);
  return { rows, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getPayrollStats(user: SessionUser, month?: string) {
  const where: Prisma.PayrollRecordWhereInput = { ...scope(user) };
  if (month) where.month = month;
  const [count, paid, payout] = await Promise.all([
    db.payrollRecord.count({ where }),
    db.payrollRecord.aggregate({ where: { ...where, status: "PAID" }, _sum: { netPay: true } }),
    db.payrollRecord.aggregate({ where, _sum: { netPay: true } }),
  ]);
  return { count, paidOut: paid._sum.netPay ?? 0, totalPayout: payout._sum.netPay ?? 0 };
}

export async function getPayroll(user: SessionUser, id: string) {
  return db.payrollRecord.findFirst({
    where: { id, ...scope(user) },
    include: { teacher: { include: { user: true } }, school: true },
  });
}

/** Months that have payroll, for the filter. */
export async function getPayrollMonths(user: SessionUser): Promise<string[]> {
  const rows = await db.payrollRecord.findMany({ where: scope(user), distinct: ["month"], select: { month: true }, orderBy: { month: "desc" } });
  return rows.map((r) => r.month);
}

export async function getPayrollTeachers(user: SessionUser) {
  const where: Prisma.TeacherWhereInput = { deletedAt: null, user: { deletedAt: null } };
  if (user.role !== "SUPER_ADMIN") where.schoolId = user.schoolId ?? "__none__";
  const teachers = await db.teacher.findMany({ where, include: { user: true }, orderBy: { user: { firstName: "asc" } } });
  return teachers.map((t) => ({ id: t.id, label: `${t.user.firstName} ${t.user.lastName} · ${t.employeeId}` }));
}
