import "server-only";
import { db } from "@/lib/db";
import { gradeFromMarks, type Grade } from "@/lib/exams/grading";
import type { ExamType } from "@prisma/client";

export interface ExamResultGroup {
  examId: string;
  examName: string;
  examType: ExamType;
  examDate: Date | null;
  subjects: { name: string; code: string; marks: number; max: number; grade: Grade & { percent: number } }[];
  gpa: number;
  percent: number;
}

export interface StudentReport {
  groups: ExamResultGroup[];
  overallGpa: number;
}

/** A student's results grouped by exam, with GPA. Published exams only by default. */
export async function studentReport(studentId: string, publishedOnly = true): Promise<StudentReport> {
  const results = await db.examResult.findMany({
    where: { studentId, exam: { deletedAt: null, ...(publishedOnly ? { published: true } : {}) } },
    include: {
      exam: { select: { id: true, name: true, type: true, examDate: true } },
      subject: { select: { name: true, code: true } },
    },
    orderBy: [{ exam: { examDate: "desc" } }, { createdAt: "desc" }],
  });

  const map = new Map<string, ExamResultGroup>();
  for (const r of results) {
    const g = gradeFromMarks(r.marksObtained, r.maxMarks);
    if (!map.has(r.examId)) {
      map.set(r.examId, {
        examId: r.examId,
        examName: r.exam.name,
        examType: r.exam.type,
        examDate: r.exam.examDate,
        subjects: [],
        gpa: 0,
        percent: 0,
      });
    }
    map.get(r.examId)!.subjects.push({ name: r.subject.name, code: r.subject.code, marks: r.marksObtained, max: r.maxMarks, grade: g });
  }

  const groups = [...map.values()].map((grp) => {
    const gpa = grp.subjects.reduce((a, s) => a + s.grade.gpa, 0) / grp.subjects.length;
    const percent = grp.subjects.reduce((a, s) => a + s.grade.percent, 0) / grp.subjects.length;
    return { ...grp, gpa: Math.round(gpa * 100) / 100, percent: Math.round(percent * 10) / 10 };
  });

  const overallGpa = groups.length ? Math.round((groups.reduce((a, g) => a + g.gpa, 0) / groups.length) * 100) / 100 : 0;
  return { groups, overallGpa };
}
