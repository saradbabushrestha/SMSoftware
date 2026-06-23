import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/types";

const PAGE_SIZE = 10;

/** Super admin sees all schools; a school admin can only see their own. */
function scope(user: SessionUser): Prisma.SchoolWhereInput {
  const base: Prisma.SchoolWhereInput = { deletedAt: null };
  if (user.role !== "SUPER_ADMIN") base.id = user.schoolId ?? "__none__";
  return base;
}

export interface ListSchoolsParams {
  q?: string;
  page?: number;
}

export async function listSchools(user: SessionUser, params: ListSchoolsParams) {
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.SchoolWhereInput = { ...scope(user) };
  if (params.q) {
    const q = params.q.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { code: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    db.school.findMany({
      where,
      include: { _count: { select: { students: true, teachers: true } } },
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.school.count({ where }),
  ]);
  return { rows, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getPlatformStats(user: SessionUser) {
  const where = scope(user);
  const [schools, active, students] = await Promise.all([
    db.school.count({ where }),
    db.school.count({ where: { ...where, isActive: true } }),
    db.student.count({ where: { deletedAt: null, school: where } }),
  ]);
  return { schools, active, students };
}

export async function getSchool(user: SessionUser, id: string) {
  return db.school.findFirst({ where: { id, ...scope(user) } });
}

export async function getSchoolStats(schoolId: string) {
  const [students, teachers, guardians, classes, users] = await Promise.all([
    db.student.count({ where: { schoolId, deletedAt: null } }),
    db.teacher.count({ where: { schoolId, deletedAt: null } }),
    db.guardian.count({ where: { schoolId, deletedAt: null } }),
    db.schoolClass.count({ where: { schoolId, deletedAt: null } }),
    db.user.count({ where: { schoolId, deletedAt: null } }),
  ]);
  return { students, teachers, guardians, classes, users };
}
