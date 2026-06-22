import "server-only";
import { Prisma, type UserStatus } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/types";

const PAGE_SIZE = 10;

function scope(user: SessionUser): Prisma.TeacherWhereInput {
  const base: Prisma.TeacherWhereInput = { deletedAt: null };
  if (user.role !== "SUPER_ADMIN") base.schoolId = user.schoolId ?? "__none__";
  return base;
}

export interface ListTeachersParams {
  q?: string;
  status?: UserStatus;
  subjectId?: string;
  page?: number;
}

const teacherListInclude = {
  user: true,
  subjects: { where: { deletedAt: null }, select: { id: true, name: true, code: true } },
  _count: { select: { sectionsLed: true } },
} satisfies Prisma.TeacherInclude;

export type TeacherListRow = Prisma.TeacherGetPayload<{ include: typeof teacherListInclude }>;

export async function listTeachers(user: SessionUser, params: ListTeachersParams) {
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.TeacherWhereInput = { ...scope(user) };

  if (params.status) where.user = { status: params.status };
  if (params.subjectId) where.subjects = { some: { id: params.subjectId } };
  if (params.q) {
    const q = params.q.trim();
    where.OR = [
      { employeeId: { contains: q, mode: "insensitive" } },
      { qualification: { contains: q, mode: "insensitive" } },
      { user: { firstName: { contains: q, mode: "insensitive" } } },
      { user: { lastName: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [rows, total] = await Promise.all([
    db.teacher.findMany({
      where,
      include: teacherListInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.teacher.count({ where }),
  ]);

  return {
    rows,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getTeacherStats(user: SessionUser) {
  const where = scope(user);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [total, active, newThisMonth] = await Promise.all([
    db.teacher.count({ where }),
    db.teacher.count({ where: { ...where, user: { status: "ACTIVE" } } }),
    db.teacher.count({ where: { ...where, createdAt: { gte: startOfMonth } } }),
  ]);
  return { total, active, newThisMonth };
}

export async function getTeacher(user: SessionUser, id: string) {
  return db.teacher.findFirst({
    where: { id, ...scope(user) },
    include: {
      user: true,
      school: true,
      subjects: { where: { deletedAt: null }, orderBy: { name: "asc" } },
      sectionsLed: {
        where: { deletedAt: null },
        include: { class: true },
        orderBy: { name: "asc" },
      },
    },
  });
}

/** Subjects (to assign) + schools (super-admin school picker), scoped. */
export async function getTeacherFormData(user: SessionUser) {
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const subjectWhere: Prisma.SubjectWhereInput = { deletedAt: null };
  if (!isSuperAdmin) subjectWhere.schoolId = user.schoolId ?? "__none__";

  const [subjects, schools] = await Promise.all([
    db.subject.findMany({
      where: subjectWhere,
      orderBy: { name: "asc" },
      include: { school: { select: { name: true } } },
    }),
    isSuperAdmin
      ? db.school.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ]);
  return { subjects, schools, isSuperAdmin };
}

export async function nextEmployeeId(schoolId: string): Promise<string> {
  const last = await db.teacher.findFirst({
    where: { schoolId, employeeId: { startsWith: "EMP-" } },
    orderBy: { employeeId: "desc" },
    select: { employeeId: true },
  });
  const lastNum = last ? parseInt(last.employeeId.replace("EMP-", ""), 10) : 0;
  const next = Number.isNaN(lastNum) ? 1 : lastNum + 1;
  return `EMP-${String(next).padStart(4, "0")}`;
}
