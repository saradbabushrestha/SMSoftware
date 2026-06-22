import "server-only";
import { Prisma, type EnrollmentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/types";

const PAGE_SIZE = 10;

/** Tenant scope: school-bound users see only their school; super admin sees all. */
function scope(user: SessionUser): Prisma.StudentWhereInput {
  const base: Prisma.StudentWhereInput = { deletedAt: null };
  if (user.role !== "SUPER_ADMIN") base.schoolId = user.schoolId ?? "__none__";
  return base;
}

export interface ListStudentsParams {
  q?: string;
  status?: EnrollmentStatus;
  classId?: string;
  page?: number;
}

const studentListInclude = {
  user: true,
  enrollments: {
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 1,
    include: { section: { include: { class: true } } },
  },
} satisfies Prisma.StudentInclude;

export type StudentListRow = Prisma.StudentGetPayload<{ include: typeof studentListInclude }>;

export async function listStudents(user: SessionUser, params: ListStudentsParams) {
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.StudentWhereInput = { ...scope(user) };

  if (params.status) where.status = params.status;
  if (params.classId) where.enrollments = { some: { section: { classId: params.classId } } };
  if (params.q) {
    const q = params.q.trim();
    where.OR = [
      { admissionNumber: { contains: q, mode: "insensitive" } },
      { rollNumber: { contains: q, mode: "insensitive" } },
      { user: { firstName: { contains: q, mode: "insensitive" } } },
      { user: { lastName: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [rows, total] = await Promise.all([
    db.student.findMany({
      where,
      include: studentListInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.student.count({ where }),
  ]);

  return {
    rows,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getStudentStats(user: SessionUser) {
  const where = scope(user);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [total, active, newThisMonth] = await Promise.all([
    db.student.count({ where }),
    db.student.count({ where: { ...where, status: "ACTIVE" } }),
    db.student.count({ where: { ...where, admittedOn: { gte: startOfMonth } } }),
  ]);
  return { total, active, newThisMonth };
}

export async function getStudent(user: SessionUser, id: string) {
  return db.student.findFirst({
    where: { id, ...scope(user) },
    include: {
      user: true,
      school: true,
      guardians: { include: { guardian: { include: { user: true } } } },
      enrollments: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: { section: { include: { class: true } }, academicYear: true },
      },
    },
  });
}

/** Classes + sections available to assign, scoped to the user's school(s). */
export async function getStudentFormData(user: SessionUser) {
  const where: Prisma.SchoolClassWhereInput = { deletedAt: null };
  if (user.role !== "SUPER_ADMIN") where.schoolId = user.schoolId ?? "__none__";

  const classes = await db.schoolClass.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      school: { select: { name: true } },
      sections: { where: { deletedAt: null }, orderBy: { name: "asc" } },
    },
  });
  return { classes, isSuperAdmin: user.role === "SUPER_ADMIN" };
}

/** Next sequential admission number for a school, e.g. ADM-0042. */
export async function nextAdmissionNumber(schoolId: string): Promise<string> {
  const last = await db.student.findFirst({
    where: { schoolId, admissionNumber: { startsWith: "ADM-" } },
    orderBy: { admissionNumber: "desc" },
    select: { admissionNumber: true },
  });
  const lastNum = last ? parseInt(last.admissionNumber.replace("ADM-", ""), 10) : 0;
  const next = Number.isNaN(lastNum) ? 1 : lastNum + 1;
  return `ADM-${String(next).padStart(4, "0")}`;
}
