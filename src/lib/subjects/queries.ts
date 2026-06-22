import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/types";

const PAGE_SIZE = 10;

function scope(user: SessionUser): Prisma.SubjectWhereInput {
  const base: Prisma.SubjectWhereInput = { deletedAt: null };
  if (user.role !== "SUPER_ADMIN") base.schoolId = user.schoolId ?? "__none__";
  return base;
}

export interface ListSubjectsParams {
  q?: string;
  classId?: string;
  page?: number;
}

const subjectListInclude = {
  class: { select: { id: true, name: true } },
  school: { select: { name: true } },
  _count: { select: { teachers: true } },
} satisfies Prisma.SubjectInclude;

export type SubjectListRow = Prisma.SubjectGetPayload<{ include: typeof subjectListInclude }>;

export async function listSubjects(user: SessionUser, params: ListSubjectsParams) {
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.SubjectWhereInput = { ...scope(user) };

  if (params.classId) where.classId = params.classId === "none" ? null : params.classId;
  if (params.q) {
    const q = params.q.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { code: { contains: q, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    db.subject.findMany({
      where,
      include: subjectListInclude,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.subject.count({ where }),
  ]);

  return {
    rows,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getSubjectStats(user: SessionUser) {
  const where = scope(user);
  const [total, classLinked, schoolWide] = await Promise.all([
    db.subject.count({ where }),
    db.subject.count({ where: { ...where, classId: { not: null } } }),
    db.subject.count({ where: { ...where, classId: null } }),
  ]);
  return { total, classLinked, schoolWide };
}

export async function getSubject(user: SessionUser, id: string) {
  return db.subject.findFirst({
    where: { id, ...scope(user) },
    include: {
      class: true,
      school: true,
      teachers: { where: { deletedAt: null }, include: { user: true }, orderBy: { user: { firstName: "asc" } } },
    },
  });
}

/** Classes + teachers (to assign) + schools (super-admin picker), scoped. */
export async function getSubjectFormData(user: SessionUser) {
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const classWhere: Prisma.SchoolClassWhereInput = { deletedAt: null };
  const teacherWhere: Prisma.TeacherWhereInput = { deletedAt: null, user: { deletedAt: null } };
  if (!isSuperAdmin) {
    classWhere.schoolId = user.schoolId ?? "__none__";
    teacherWhere.schoolId = user.schoolId ?? "__none__";
  }

  const [classes, teachers, schools] = await Promise.all([
    db.schoolClass.findMany({
      where: classWhere,
      orderBy: { name: "asc" },
      include: { school: { select: { name: true } } },
    }),
    db.teacher.findMany({
      where: teacherWhere,
      include: { user: true, school: { select: { name: true } } },
      orderBy: { user: { firstName: "asc" } },
    }),
    isSuperAdmin
      ? db.school.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ]);
  return { classes, teachers, schools, isSuperAdmin };
}
