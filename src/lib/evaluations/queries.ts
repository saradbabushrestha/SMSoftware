import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/types";
import { overallScore } from "@/lib/evaluations/display";

function teacherScope(user: SessionUser): Prisma.TeacherWhereInput {
  return user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {};
}

function scope(user: SessionUser): Prisma.TeacherEvaluationWhereInput {
  return user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {};
}

/** Ensure the teacher exists and is in the caller's school. */
export async function getEvaluableTeacher(user: SessionUser, teacherId: string) {
  return db.teacher.findFirst({
    where: { id: teacherId, deletedAt: null, ...teacherScope(user) },
    include: { user: true },
  });
}

export async function listEvaluations(user: SessionUser, teacherId: string) {
  return db.teacherEvaluation.findMany({
    where: { teacherId, deletedAt: null, ...scope(user) },
    orderBy: { createdAt: "desc" },
  });
}

/** Count + average overall score for a teacher. */
export async function evaluationSummary(user: SessionUser, teacherId: string) {
  const rows = await db.teacherEvaluation.findMany({
    where: { teacherId, deletedAt: null, ...scope(user) },
    select: { teaching: true, classroom: true, collaboration: true, punctuality: true },
  });
  if (rows.length === 0) return { count: 0, average: 0 };
  const avg = rows.reduce((a, r) => a + overallScore(r), 0) / rows.length;
  return { count: rows.length, average: Math.round(avg * 10) / 10 };
}

export async function getEvaluation(user: SessionUser, id: string) {
  return db.teacherEvaluation.findFirst({
    where: { id, deletedAt: null, ...scope(user) },
    include: { teacher: { include: { user: true } } },
  });
}
