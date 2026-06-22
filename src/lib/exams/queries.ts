import "server-only";
import { Prisma, type ExamType } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/types";
import { gradeFromMarks } from "@/lib/exams/grading";

const PAGE_SIZE = 10;

function scope(user: SessionUser): Prisma.ExamWhereInput {
  const base: Prisma.ExamWhereInput = { deletedAt: null };
  if (user.role !== "SUPER_ADMIN") base.schoolId = user.schoolId ?? "__none__";
  return base;
}

export interface ListExamsParams {
  q?: string;
  classId?: string;
  type?: ExamType;
  page?: number;
}

const examListInclude = {
  class: { select: { id: true, name: true } },
  school: { select: { name: true } },
  _count: { select: { results: true } },
} satisfies Prisma.ExamInclude;

export type ExamListRow = Prisma.ExamGetPayload<{ include: typeof examListInclude }>;

export async function listExams(user: SessionUser, params: ListExamsParams) {
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.ExamWhereInput = { ...scope(user) };
  if (params.classId) where.classId = params.classId;
  if (params.type) where.type = params.type;
  if (params.q) where.name = { contains: params.q.trim(), mode: "insensitive" };

  const [rows, total] = await Promise.all([
    db.exam.findMany({
      where,
      include: examListInclude,
      orderBy: [{ examDate: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.exam.count({ where }),
  ]);

  return { rows, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getExamStats(user: SessionUser) {
  const where = scope(user);
  const [total, published] = await Promise.all([
    db.exam.count({ where }),
    db.exam.count({ where: { ...where, published: true } }),
  ]);
  return { total, published, draft: total - published };
}

export async function getExam(user: SessionUser, id: string) {
  return db.exam.findFirst({
    where: { id, ...scope(user) },
    include: { class: true, academicYear: true, school: true, _count: { select: { results: true } } },
  });
}

export async function getExamFormData(user: SessionUser) {
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const classWhere: Prisma.SchoolClassWhereInput = { deletedAt: null };
  if (!isSuperAdmin) classWhere.schoolId = user.schoolId ?? "__none__";

  const [classes, schools] = await Promise.all([
    db.schoolClass.findMany({ where: classWhere, orderBy: { name: "asc" }, include: { school: { select: { name: true } } } }),
    isSuperAdmin
      ? db.school.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ]);
  return { classes, schools, isSuperAdmin };
}

/** Subjects gradeable for an exam: tied to the class or school-wide. */
export async function getExamSubjects(exam: { schoolId: string; classId: string }) {
  return db.subject.findMany({
    where: { schoolId: exam.schoolId, deletedAt: null, OR: [{ classId: exam.classId }, { classId: null }] },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });
}

export interface GradeRosterRow {
  studentId: string;
  name: string;
  rollNumber: string | null;
  marks: number | null;
}

/** The roster for grade entry: students in the exam's class + their marks for one subject. */
export async function getGradeRoster(user: SessionUser, examId: string, subjectId: string) {
  const exam = await getExam(user, examId);
  if (!exam) return null;

  const enrollments = await db.enrollment.findMany({
    where: {
      section: { classId: exam.classId },
      deletedAt: null,
      academicYear: { status: "ACTIVE" },
      student: { deletedAt: null },
    },
    include: { student: { include: { user: true } } },
  });

  const results = await db.examResult.findMany({ where: { examId, subjectId } });
  const byStudent = new Map(results.map((r) => [r.studentId, r.marksObtained]));

  const rows: GradeRosterRow[] = enrollments
    .map((e) => ({
      studentId: e.studentId,
      name: `${e.student.user.firstName} ${e.student.user.lastName}`,
      rollNumber: e.rollNumber ?? e.student.rollNumber,
      marks: byStudent.get(e.studentId) ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { rows, maxMarks: exam.maxMarks };
}

/** Per-student results matrix for an exam (staff results view). */
export async function getExamResults(user: SessionUser, examId: string) {
  const exam = await getExam(user, examId);
  if (!exam) return null;

  const [subjects, results, enrollments] = await Promise.all([
    getExamSubjects(exam),
    db.examResult.findMany({ where: { examId } }),
    db.enrollment.findMany({
      where: { section: { classId: exam.classId }, deletedAt: null, academicYear: { status: "ACTIVE" }, student: { deletedAt: null } },
      include: { student: { include: { user: true } } },
    }),
  ]);

  const resultsByStudent = new Map<string, Map<string, { marks: number; max: number }>>();
  for (const r of results) {
    if (!resultsByStudent.has(r.studentId)) resultsByStudent.set(r.studentId, new Map());
    resultsByStudent.get(r.studentId)!.set(r.subjectId, { marks: r.marksObtained, max: r.maxMarks });
  }

  const students = enrollments
    .map((e) => {
      const subjMap = resultsByStudent.get(e.studentId);
      const cells = subjects.map((s) => {
        const rec = subjMap?.get(s.id);
        return { subjectId: s.id, ...(rec ? gradeFromMarks(rec.marks, rec.max) : null), marks: rec?.marks ?? null };
      });
      const graded = cells.filter((c) => c.marks !== null);
      const gpa = graded.length ? graded.reduce((acc, c) => acc + (c.gpa ?? 0), 0) / graded.length : 0;
      return {
        studentId: e.studentId,
        name: `${e.student.user.firstName} ${e.student.user.lastName}`,
        cells,
        gpa: Math.round(gpa * 100) / 100,
        gradedCount: graded.length,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return { exam, subjects, students };
}
