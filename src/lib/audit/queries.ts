import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/types";
import { rangeSince } from "@/lib/audit/display";

const PAGE_SIZE = 20;

function scope(user: SessionUser): Prisma.AuditLogWhereInput {
  // School-scoped admins/principals see only their school's events; super admin sees all.
  return user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {};
}

export interface ListAuditParams {
  q?: string;
  range?: string;
  page?: number;
}

export async function listAuditLogs(user: SessionUser, params: ListAuditParams) {
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.AuditLogWhereInput = { ...scope(user) };

  const since = rangeSince(params.range);
  if (since) where.createdAt = { gte: since };
  if (params.q) {
    const q = params.q.trim();
    where.OR = [
      { action: { contains: q, mode: "insensitive" } },
      { entityType: { contains: q, mode: "insensitive" } },
      { entityId: { contains: q, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { user: { select: { firstName: true, lastName: true, role: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.auditLog.count({ where }),
  ]);

  return { rows, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getAuditStats(user: SessionUser) {
  const base = scope(user);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);

  const [total, today, logins] = await Promise.all([
    db.auditLog.count({ where: base }),
    db.auditLog.count({ where: { ...base, createdAt: { gte: startOfDay } } }),
    db.auditLog.count({ where: { ...base, action: "auth.login", createdAt: { gte: weekAgo } } }),
  ]);
  return { total, today, logins };
}

export async function getAuditLog(user: SessionUser, id: string) {
  return db.auditLog.findFirst({
    where: { id, ...scope(user) },
    include: {
      user: { select: { firstName: true, lastName: true, email: true, role: true } },
      school: { select: { name: true } },
    },
  });
}
