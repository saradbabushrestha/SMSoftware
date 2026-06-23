import "server-only";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/types";
import type { AttendanceStatus } from "@prisma/client";
import { toCsv } from "@/lib/reports/csv";
import { gradeFromMarks } from "@/lib/exams/grading";

function schoolId(user: SessionUser): string | undefined {
  return user.role === "SUPER_ADMIN" ? undefined : (user.schoolId ?? "__none__");
}

export interface ReportFile {
  filename: string;
  csv: string;
}

export async function buildReport(user: SessionUser, key: string): Promise<ReportFile | null> {
  const sid = schoolId(user);

  switch (key) {
    case "students": {
      const students = await db.student.findMany({
        where: { schoolId: sid, deletedAt: null },
        include: {
          user: true,
          enrollments: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 1, include: { section: { include: { class: true } } } },
        },
        orderBy: { admissionNumber: "asc" },
      });
      const csv = toCsv(
        ["Admission No.", "First name", "Last name", "Email", "Gender", "Class", "Section", "Roll", "Status"],
        students.map((s) => {
          const enr = s.enrollments[0];
          return [s.admissionNumber, s.user.firstName, s.user.lastName, s.user.email, s.gender, enr?.section.class.name ?? "", enr?.section.name ?? "", s.rollNumber ?? "", s.status];
        }),
      );
      return { filename: "students.csv", csv };
    }

    case "teachers": {
      const teachers = await db.teacher.findMany({
        where: { schoolId: sid, deletedAt: null },
        include: { user: true, subjects: { select: { code: true } } },
        orderBy: { employeeId: "asc" },
      });
      const csv = toCsv(
        ["Employee ID", "First name", "Last name", "Email", "Qualification", "Experience (yrs)", "Subjects", "Status"],
        teachers.map((t) => [t.employeeId, t.user.firstName, t.user.lastName, t.user.email, t.qualification ?? "", t.experienceYrs, t.subjects.map((x) => x.code).join(" "), t.user.status]),
      );
      return { filename: "teachers.csv", csv };
    }

    case "attendance": {
      const records = await db.attendance.findMany({ where: { schoolId: sid }, select: { studentId: true, status: true } });
      const agg = new Map<string, Record<AttendanceStatus, number>>();
      for (const r of records) {
        const a = agg.get(r.studentId) ?? { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0 };
        a[r.status]++;
        agg.set(r.studentId, a);
      }
      const students = await db.student.findMany({ where: { id: { in: [...agg.keys()] } }, include: { user: true } });
      const byId = new Map(students.map((s) => [s.id, s]));
      const csv = toCsv(
        ["Admission No.", "Student", "Present", "Absent", "Late", "Leave", "Total", "Attendance %"],
        [...agg.entries()].map(([id, a]) => {
          const s = byId.get(id);
          const total = a.PRESENT + a.ABSENT + a.LATE + a.LEAVE;
          const pct = total ? Math.round(((a.PRESENT + a.LATE) / total) * 100) : 0;
          return [s?.admissionNumber ?? "", s ? `${s.user.firstName} ${s.user.lastName}` : "", a.PRESENT, a.ABSENT, a.LATE, a.LEAVE, total, pct];
        }),
      );
      return { filename: "attendance-summary.csv", csv };
    }

    case "invoices": {
      const invoices = await db.invoice.findMany({
        where: { schoolId: sid, deletedAt: null },
        include: { student: { include: { user: true } }, payments: { select: { amount: true } } },
        orderBy: { createdAt: "desc" },
      });
      const csv = toCsv(
        ["Admission No.", "Student", "Category", "Title", "Amount", "Paid", "Balance", "Status", "Due date"],
        invoices.map((inv) => {
          const paid = inv.payments.reduce((a, p) => a + p.amount, 0);
          return [inv.student.admissionNumber, `${inv.student.user.firstName} ${inv.student.user.lastName}`, inv.category, inv.title, inv.amount, paid, Math.max(0, inv.amount - paid), inv.status, inv.dueDate ? inv.dueDate.toISOString().slice(0, 10) : ""];
        }),
      );
      return { filename: "invoices.csv", csv };
    }

    case "payments": {
      const payments = await db.payment.findMany({
        where: { schoolId: sid },
        include: { invoice: { include: { student: { include: { user: true } } } } },
        orderBy: { paidAt: "desc" },
      });
      const csv = toCsv(
        ["Date", "Admission No.", "Student", "Invoice", "Method", "Reference", "Amount"],
        payments.map((p) => [p.paidAt.toISOString().slice(0, 10), p.invoice.student.admissionNumber, `${p.invoice.student.user.firstName} ${p.invoice.student.user.lastName}`, p.invoice.title, p.method, p.reference ?? "", p.amount]),
      );
      return { filename: "payments.csv", csv };
    }

    case "grades": {
      const results = await db.examResult.findMany({
        where: { exam: { schoolId: sid, deletedAt: null } },
        include: { student: { include: { user: true } }, exam: { select: { name: true, type: true } }, subject: { select: { name: true, code: true } } },
        orderBy: [{ exam: { createdAt: "desc" } }],
      });
      const csv = toCsv(
        ["Admission No.", "Student", "Exam", "Type", "Subject", "Marks", "Max", "Percent", "Grade"],
        results.map((r) => {
          const g = gradeFromMarks(r.marksObtained, r.maxMarks);
          return [r.student.admissionNumber, `${r.student.user.firstName} ${r.student.user.lastName}`, r.exam.name, r.exam.type, r.subject.name, r.marksObtained, r.maxMarks, g.percent, g.letter];
        }),
      );
      return { filename: "exam-results.csv", csv };
    }

    default:
      return null;
  }
}
