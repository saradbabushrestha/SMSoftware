import "server-only";
import { Prisma, type UserRole, type UserStatus } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/types";

const PAGE_SIZE = 10;

function scope(user: SessionUser): Prisma.UserWhereInput {
  const base: Prisma.UserWhereInput = { deletedAt: null };
  if (user.role !== "SUPER_ADMIN") base.schoolId = user.schoolId ?? "__none__";
  return base;
}

export interface ListUsersParams {
  q?: string;
  role?: UserRole;
  status?: UserStatus;
  page?: number;
}

export async function listUsers(user: SessionUser, params: ListUsersParams) {
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.UserWhereInput = { ...scope(user) };
  if (params.role) where.role = params.role;
  if (params.status) where.status = params.status;
  if (params.q) {
    const q = params.q.trim();
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    db.user.findMany({
      where,
      include: { school: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.user.count({ where }),
  ]);
  return { rows, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getUserStats(user: SessionUser) {
  const where = scope(user);
  const [total, active, staff] = await Promise.all([
    db.user.count({ where }),
    db.user.count({ where: { ...where, status: "ACTIVE" } }),
    db.user.count({ where: { ...where, role: { in: ["SCHOOL_ADMIN", "PRINCIPAL", "ACCOUNTANT", "LIBRARIAN", "SUPER_ADMIN"] } } }),
  ]);
  return { total, active, staff };
}

export async function getManagedUser(user: SessionUser, id: string) {
  return db.user.findFirst({
    where: { id, ...scope(user) },
    include: {
      school: { select: { name: true } },
      teacherProfile: { select: { id: true } },
      studentProfile: { select: { id: true } },
      guardianProfile: { select: { id: true } },
    },
  });
}

export async function getUserSchools() {
  return db.school.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } });
}
