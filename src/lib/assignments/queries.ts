import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/types";

const PAGE_SIZE = 10;

function scope(user: SessionUser): Prisma.AssignmentWhereInput {
  const base: Prisma.AssignmentWhereInput = { deletedAt: null };
  if (user.role !== "SUPER_ADMIN") base.schoolId = user.schoolId ?? "__none__";
  return base;
}

/** The student profile id + section ids the signed-in student is enrolled in. */
export async function studentContext(user: SessionUser): Promise<{ studentId: string | null; sectionIds: string[] }> {
  const student = await db.student.findFirst({
    where: { userId: user.id, deletedAt: null },
    include: { enrollments: { where: { deletedAt: null, academicYear: { status: "ACTIVE" } }, select: { sectionId: true } } },
  });
  if (!student) return { studentId: null, sectionIds: [] };
  return { studentId: student.id, sectionIds: student.enrollments.map((e) => e.sectionId) };
}

const listInclude = {
  subject: { select: { name: true, code: true } },
  section: { include: { class: { select: { name: true } } } },
  _count: { select: { submissions: true } },
} satisfies Prisma.AssignmentInclude;

export interface ListAssignmentsParams {
  sectionId?: string;
  page?: number;
}

/** Teacher/admin view: all assignments in scope. */
export async function listAssignments(user: SessionUser, params: ListAssignmentsParams) {
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.AssignmentWhereInput = { ...scope(user) };
  if (params.sectionId) where.sectionId = params.sectionId;

  const [rows, total] = await Promise.all([
    db.assignment.findMany({ where, include: listInclude, orderBy: { dueDate: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.assignment.count({ where }),
  ]);
  return { rows, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** Student view: assignments for their section(s), each with their own submission. */
export async function listStudentAssignments(user: SessionUser, page = 1) {
  const { studentId, sectionIds } = await studentContext(user);
  if (!studentId || sectionIds.length === 0) {
    return { rows: [], total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 1, studentId };
  }
  const where: Prisma.AssignmentWhereInput = { ...scope(user), sectionId: { in: sectionIds } };
  const [rows, total] = await Promise.all([
    db.assignment.findMany({
      where,
      include: { subject: { select: { name: true, code: true } }, submissions: { where: { studentId } } },
      orderBy: { dueDate: "desc" },
      skip: (Math.max(1, page) - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.assignment.count({ where }),
  ]);
  return { rows, total, page: Math.max(1, page), pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)), studentId };
}

export async function getAssignmentStats(user: SessionUser) {
  const base = scope(user);
  const now = new Date();
  const [total, upcoming, ungraded] = await Promise.all([
    db.assignment.count({ where: base }),
    db.assignment.count({ where: { ...base, dueDate: { gte: now } } }),
    db.submission.count({ where: { status: "SUBMITTED", assignment: base } }),
  ]);
  return { total, upcoming, ungraded };
}

export async function getAssignment(user: SessionUser, id: string) {
  return db.assignment.findFirst({
    where: { id, ...scope(user) },
    include: {
      subject: { select: { name: true, code: true } },
      section: { include: { class: { select: { name: true } } } },
      createdBy: { select: { firstName: true, lastName: true } },
      _count: { select: { submissions: true } },
    },
  });
}

/** Section roster + each student's submission (for the teacher's grading view). */
export async function getAssignmentSubmissions(assignmentId: string, sectionId: string) {
  const [enrollments, submissions] = await Promise.all([
    db.enrollment.findMany({
      where: { sectionId, deletedAt: null, academicYear: { status: "ACTIVE" }, student: { deletedAt: null } },
      include: { student: { include: { user: true } } },
    }),
    db.submission.findMany({ where: { assignmentId } }),
  ]);
  const byStudent = new Map(submissions.map((s) => [s.studentId, s]));
  return enrollments
    .map((e) => ({
      studentId: e.studentId,
      name: `${e.student.user.firstName} ${e.student.user.lastName}`,
      submission: byStudent.get(e.studentId) ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** A single student's submission for an assignment. */
export async function getMySubmission(assignmentId: string, studentId: string) {
  return db.submission.findUnique({ where: { assignmentId_studentId: { assignmentId, studentId } } });
}

/** Sections + subjects a teacher can target when creating an assignment. */
export async function getAssignmentFormData(user: SessionUser) {
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const classWhere: Prisma.SchoolClassWhereInput = { deletedAt: null };
  const subjectWhere: Prisma.SubjectWhereInput = { deletedAt: null };
  if (!isSuperAdmin) {
    classWhere.schoolId = user.schoolId ?? "__none__";
    subjectWhere.schoolId = user.schoolId ?? "__none__";
  }
  const [classes, subjects] = await Promise.all([
    db.schoolClass.findMany({
      where: classWhere,
      orderBy: { name: "asc" },
      include: { school: { select: { name: true } }, sections: { where: { deletedAt: null }, orderBy: { name: "asc" } } },
    }),
    db.subject.findMany({ where: subjectWhere, orderBy: { name: "asc" }, include: { school: { select: { name: true } } } }),
  ]);
  const sections = classes.flatMap((c) =>
    c.sections.map((s) => ({ id: s.id, label: `${isSuperAdmin ? `${c.school.name} · ` : ""}${c.name} · ${s.name}` })),
  );
  const subjectOptions = subjects.map((s) => ({ id: s.id, label: `${isSuperAdmin ? `${s.school.name} · ` : ""}${s.name} · ${s.code}` }));
  return { sections, subjects: subjectOptions };
}
