import "server-only";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/types";
import type { AttendanceStatus, Gender } from "@prisma/client";

/** schoolId filter (super admin → all schools). */
function sid(user: SessionUser): string | undefined {
  return user.role === "SUPER_ADMIN" ? undefined : (user.schoolId ?? "__none__");
}

export async function headlineStats(user: SessionUser) {
  const schoolId = sid(user);
  const [students, teachers, att, billedAgg, collectedAgg] = await Promise.all([
    db.student.count({ where: { schoolId, deletedAt: null } }),
    db.teacher.count({ where: { schoolId, deletedAt: null } }),
    db.attendance.groupBy({ by: ["status"], where: { schoolId }, _count: true }),
    db.invoice.aggregate({ where: { schoolId, deletedAt: null, status: { not: "CANCELLED" } }, _sum: { amount: true } }),
    db.payment.aggregate({ where: { schoolId }, _sum: { amount: true } }),
  ]);

  const attTotal = att.reduce((a, r) => a + r._count, 0);
  const attended = att.filter((r) => r.status === "PRESENT" || r.status === "LATE").reduce((a, r) => a + r._count, 0);
  const billed = billedAgg._sum.amount ?? 0;
  const collected = collectedAgg._sum.amount ?? 0;

  return {
    students,
    teachers,
    attendancePct: attTotal ? Math.round((attended / attTotal) * 100) : 0,
    collectionRate: billed ? Math.round((collected / billed) * 100) : 0,
  };
}

export async function enrollmentByClass(user: SessionUser) {
  const schoolId = sid(user);
  const enrollments = await db.enrollment.findMany({
    where: { schoolId, deletedAt: null, academicYear: { status: "ACTIVE" }, student: { deletedAt: null } },
    include: { section: { include: { class: { select: { name: true } } } } },
  });
  const counts = new Map<string, number>();
  for (const e of enrollments) counts.set(e.section.class.name, (counts.get(e.section.class.name) ?? 0) + 1);
  return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => a.label.localeCompare(b.label));
}

const ATT_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: "var(--chart-2)",
  ABSENT: "var(--chart-1)",
  LATE: "var(--chart-3)",
  LEAVE: "var(--chart-4)",
};
const ATT_NAMES: Record<AttendanceStatus, string> = { PRESENT: "Present", ABSENT: "Absent", LATE: "Late", LEAVE: "Leave" };

export async function attendanceBreakdown(user: SessionUser) {
  const rows = await db.attendance.groupBy({ by: ["status"], where: { schoolId: sid(user) }, _count: true });
  return (Object.keys(ATT_NAMES) as AttendanceStatus[])
    .map((s) => ({ name: ATT_NAMES[s], value: rows.find((r) => r.status === s)?._count ?? 0, color: ATT_COLORS[s] }))
    .filter((d) => d.value > 0);
}

const GENDER_NAMES: Record<Gender, string> = { MALE: "Male", FEMALE: "Female", OTHER: "Other", UNDISCLOSED: "Undisclosed" };
const GENDER_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-4)", "var(--chart-5)"];

export async function genderDistribution(user: SessionUser) {
  const rows = await db.student.groupBy({ by: ["gender"], where: { schoolId: sid(user), deletedAt: null }, _count: true });
  return rows
    .map((r, i) => ({ name: GENDER_NAMES[r.gender], value: r._count, color: GENDER_COLORS[i % GENDER_COLORS.length] }))
    .filter((d) => d.value > 0);
}

export async function feeCollection(user: SessionUser) {
  const schoolId = sid(user);
  const [billedAgg, collectedAgg] = await Promise.all([
    db.invoice.aggregate({ where: { schoolId, deletedAt: null, status: { not: "CANCELLED" } }, _sum: { amount: true } }),
    db.payment.aggregate({ where: { schoolId }, _sum: { amount: true } }),
  ]);
  const billed = billedAgg._sum.amount ?? 0;
  const collected = collectedAgg._sum.amount ?? 0;
  const outstanding = Math.max(0, billed - collected);
  return [
    { name: "Collected", value: Math.round(collected), color: "var(--chart-2)" },
    { name: "Outstanding", value: Math.round(outstanding), color: "var(--chart-3)" },
  ].filter((d) => d.value > 0);
}

export interface AtRiskRow {
  studentId: string;
  name: string;
  admissionNumber: string;
  percentage: number;
  days: number;
}

/** Students whose attendance has dropped below a threshold (predictive flag). */
export async function atRiskStudents(user: SessionUser, threshold = 80): Promise<AtRiskRow[]> {
  const records = await db.attendance.findMany({ where: { schoolId: sid(user) }, select: { studentId: true, status: true } });
  const agg = new Map<string, { total: number; attended: number }>();
  for (const r of records) {
    const a = agg.get(r.studentId) ?? { total: 0, attended: 0 };
    a.total++;
    if (r.status === "PRESENT" || r.status === "LATE") a.attended++;
    agg.set(r.studentId, a);
  }

  const risky = [...agg.entries()]
    .map(([studentId, a]) => ({ studentId, days: a.total, percentage: a.total ? Math.round((a.attended / a.total) * 100) : 0 }))
    .filter((x) => x.days >= 5 && x.percentage < threshold)
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 10);

  if (risky.length === 0) return [];
  const students = await db.student.findMany({
    where: { id: { in: risky.map((r) => r.studentId) } },
    include: { user: { select: { firstName: true, lastName: true } } },
  });
  const byId = new Map(students.map((s) => [s.id, s]));
  return risky.map((r) => {
    const s = byId.get(r.studentId);
    return { ...r, name: s ? `${s.user.firstName} ${s.user.lastName}` : "—", admissionNumber: s?.admissionNumber ?? "—" };
  });
}
