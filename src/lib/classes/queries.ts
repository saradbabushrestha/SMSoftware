import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/types";

const PAGE_SIZE = 10;

function scope(user: SessionUser): Prisma.SchoolClassWhereInput {
  const base: Prisma.SchoolClassWhereInput = { deletedAt: null };
  if (user.role !== "SUPER_ADMIN") base.schoolId = user.schoolId ?? "__none__";
  return base;
}

export interface ListClassesParams {
  q?: string;
  page?: number;
}

const classListInclude = {
  school: { select: { name: true } },
  sections: {
    where: { deletedAt: null },
    select: { id: true, capacity: true, _count: { select: { enrollments: true } } },
  },
  _count: { select: { subjects: true } },
} satisfies Prisma.SchoolClassInclude;

export type ClassListRow = Prisma.SchoolClassGetPayload<{ include: typeof classListInclude }>;

export async function listClasses(user: SessionUser, params: ListClassesParams) {
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.SchoolClassWhereInput = { ...scope(user) };

  if (params.q) {
    const q = params.q.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { code: { contains: q, mode: "insensitive" } },
      { stream: { contains: q, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    db.schoolClass.findMany({
      where,
      include: classListInclude,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.schoolClass.count({ where }),
  ]);

  return {
    rows,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getClassStats(user: SessionUser) {
  const where = scope(user);
  const sectionWhere: Prisma.SectionWhereInput = { deletedAt: null, class: where };

  const [classes, sections, students] = await Promise.all([
    db.schoolClass.count({ where }),
    db.section.count({ where: sectionWhere }),
    db.enrollment.count({
      where: { deletedAt: null, status: "ACTIVE", section: { class: where } },
    }),
  ]);
  return { classes, sections, students };
}

export async function getClass(user: SessionUser, id: string) {
  return db.schoolClass.findFirst({
    where: { id, ...scope(user) },
    include: {
      school: true,
      subjects: { where: { deletedAt: null }, orderBy: { name: "asc" } },
      sections: {
        where: { deletedAt: null },
        orderBy: { name: "asc" },
        include: {
          classTeacher: { include: { user: true } },
          _count: { select: { enrollments: true } },
        },
      },
    },
  });
}

/** Teachers available to lead a section, scoped to a school. */
export async function getClassTeacherOptions(schoolId: string) {
  const teachers = await db.teacher.findMany({
    where: { schoolId, deletedAt: null, user: { deletedAt: null } },
    include: { user: true },
    orderBy: { user: { firstName: "asc" } },
  });
  return teachers.map((t) => ({
    id: t.id,
    label: `${t.user.firstName} ${t.user.lastName} · ${t.employeeId}`,
  }));
}
