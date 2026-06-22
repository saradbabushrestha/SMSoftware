import "server-only";
import { Prisma, type UserStatus } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/types";

const PAGE_SIZE = 10;

function scope(user: SessionUser): Prisma.GuardianWhereInput {
  const base: Prisma.GuardianWhereInput = { deletedAt: null };
  if (user.role !== "SUPER_ADMIN") base.schoolId = user.schoolId ?? "__none__";
  return base;
}

export interface ListGuardiansParams {
  q?: string;
  status?: UserStatus;
  page?: number;
}

const guardianListInclude = {
  user: true,
  _count: { select: { students: true } },
} satisfies Prisma.GuardianInclude;

export type GuardianListRow = Prisma.GuardianGetPayload<{ include: typeof guardianListInclude }>;

export async function listGuardians(user: SessionUser, params: ListGuardiansParams) {
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.GuardianWhereInput = { ...scope(user) };

  if (params.status) where.user = { status: params.status };
  if (params.q) {
    const q = params.q.trim();
    where.OR = [
      { occupation: { contains: q, mode: "insensitive" } },
      { user: { firstName: { contains: q, mode: "insensitive" } } },
      { user: { lastName: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { user: { phone: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [rows, total] = await Promise.all([
    db.guardian.findMany({
      where,
      include: guardianListInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.guardian.count({ where }),
  ]);

  return {
    rows,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getGuardianStats(user: SessionUser) {
  const where = scope(user);
  const [total, active, linked] = await Promise.all([
    db.guardian.count({ where }),
    db.guardian.count({ where: { ...where, user: { status: "ACTIVE" } } }),
    db.guardian.count({ where: { ...where, students: { some: {} } } }),
  ]);
  return { total, active, linked };
}

export async function getGuardian(user: SessionUser, id: string) {
  return db.guardian.findFirst({
    where: { id, ...scope(user) },
    include: {
      user: true,
      school: true,
      students: {
        include: { student: { include: { user: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

/** Active students in a school not yet linked to this guardian. */
export async function getLinkableStudents(schoolId: string, guardianId: string) {
  const students = await db.student.findMany({
    where: {
      schoolId,
      deletedAt: null,
      guardians: { none: { guardianId } },
    },
    include: { user: true },
    orderBy: { user: { firstName: "asc" } },
    take: 500,
  });
  return students.map((s) => ({
    id: s.id,
    label: `${s.user.firstName} ${s.user.lastName} · ${s.admissionNumber}`,
  }));
}
