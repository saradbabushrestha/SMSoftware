import "server-only";
import { Prisma, type AttendanceStatus } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/types";

/** Sections the user may pick, as flat {id,label} options. */
export async function getMarkableSections(user: SessionUser) {
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

  const isSuper = user.role === "SUPER_ADMIN";
  return classes.flatMap((c) =>
    c.sections.map((s) => ({
      id: s.id,
      label: `${isSuper ? `${c.school.name} · ` : ""}${c.name} · ${s.name}`,
    })),
  );
}

export interface RosterRow {
  studentId: string;
  name: string;
  admissionNumber: string;
  rollNumber: string | null;
  status: AttendanceStatus | null;
}

/** A section's current roster with each student's status for a given date. */
export async function getRoster(
  user: SessionUser,
  sectionId: string,
  date: Date,
): Promise<{ rows: RosterRow[]; sectionLabel: string } | null> {
  const classWhere: Prisma.SchoolClassWhereInput = { deletedAt: null };
  if (user.role !== "SUPER_ADMIN") classWhere.schoolId = user.schoolId ?? "__none__";

  const section = await db.section.findFirst({
    where: { id: sectionId, deletedAt: null, class: classWhere },
    include: { class: true },
  });
  if (!section) return null;

  const enrollments = await db.enrollment.findMany({
    where: {
      sectionId,
      deletedAt: null,
      academicYear: { status: "ACTIVE" },
      student: { deletedAt: null },
    },
    include: { student: { include: { user: true } } },
  });

  const records = await db.attendance.findMany({ where: { sectionId, date } });
  const byStudent = new Map(records.map((r) => [r.studentId, r.status]));

  const rows: RosterRow[] = enrollments
    .map((e) => ({
      studentId: e.studentId,
      name: `${e.student.user.firstName} ${e.student.user.lastName}`,
      admissionNumber: e.student.admissionNumber,
      rollNumber: e.rollNumber ?? e.student.rollNumber,
      status: byStudent.get(e.studentId) ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { rows, sectionLabel: `${section.class.name} · ${section.name}` };
}

export async function getDailySummary(sectionId: string, date: Date) {
  const records = await db.attendance.findMany({
    where: { sectionId, date },
    select: { status: true },
  });
  const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0 } as Record<AttendanceStatus, number>;
  for (const r of records) counts[r.status]++;
  return { ...counts, marked: records.length };
}

export interface AttendanceSummary {
  PRESENT: number;
  ABSENT: number;
  LATE: number;
  LEAVE: number;
  total: number;
  percentage: number; // present + late, as % of total
  recent: { date: Date; status: AttendanceStatus }[];
}

/** A single student's attendance summary (used for the student/parent self-view). */
export async function attendanceSummaryFor(studentId: string): Promise<AttendanceSummary> {
  const records = await db.attendance.findMany({
    where: { studentId },
    orderBy: { date: "desc" },
    select: { status: true, date: true },
  });
  const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0 } as Record<AttendanceStatus, number>;
  for (const r of records) counts[r.status]++;
  const total = records.length;
  const attended = counts.PRESENT + counts.LATE;
  return {
    ...counts,
    total,
    percentage: total ? Math.round((attended / total) * 100) : 0,
    recent: records.slice(0, 12),
  };
}

/** The signed-in student's own student id (or null). */
export async function getOwnStudentId(user: SessionUser): Promise<string | null> {
  const s = await db.student.findFirst({ where: { userId: user.id, deletedAt: null }, select: { id: true } });
  return s?.id ?? null;
}

/** Children linked to the signed-in guardian. */
export async function getGuardianChildren(user: SessionUser) {
  const guardian = await db.guardian.findFirst({
    where: { userId: user.id, deletedAt: null },
    include: {
      students: {
        include: { student: { include: { user: true } } },
      },
    },
  });
  if (!guardian) return [];
  return guardian.students
    .filter((sg) => !sg.student.deletedAt)
    .map((sg) => ({
      studentId: sg.studentId,
      name: `${sg.student.user.firstName} ${sg.student.user.lastName}`,
      admissionNumber: sg.student.admissionNumber,
    }));
}
