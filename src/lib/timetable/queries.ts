import "server-only";
import { Prisma, type Weekday } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/types";
import { timeToMinutes } from "@/lib/timetable/display";

function classScope(user: SessionUser): Prisma.SchoolClassWhereInput {
  const base: Prisma.SchoolClassWhereInput = { deletedAt: null };
  if (user.role !== "SUPER_ADMIN") base.schoolId = user.schoolId ?? "__none__";
  return base;
}

/** Sections the user may view, as flat {id,label} options. */
export async function getTimetableSections(user: SessionUser) {
  const classes = await db.schoolClass.findMany({
    where: classScope(user),
    orderBy: { name: "asc" },
    include: { school: { select: { name: true } }, sections: { where: { deletedAt: null }, orderBy: { name: "asc" } } },
  });
  const isSuper = user.role === "SUPER_ADMIN";
  return classes.flatMap((c) => c.sections.map((s) => ({ id: s.id, label: `${isSuper ? `${c.school.name} · ` : ""}${c.name} · ${s.name}` })));
}

export interface TimetableEntryView {
  id: string;
  day: Weekday;
  startTime: string;
  endTime: string;
  room: string | null;
  subjectId: string;
  subject: string;
  subjectCode: string;
  teacherId: string | null;
  teacher: string | null;
}

/** Verify a section is in scope and return its label. */
export async function getSectionMeta(user: SessionUser, sectionId: string) {
  const section = await db.section.findFirst({
    where: { id: sectionId, deletedAt: null, class: classScope(user) },
    include: { class: true },
  });
  if (!section) return null;
  return { id: section.id, schoolId: section.class.schoolId, label: `${section.class.name} · ${section.name}` };
}

/** All timetable entries for a section, grouped by weekday and sorted by time. */
export async function getTimetable(sectionId: string): Promise<Record<Weekday, TimetableEntryView[]>> {
  const entries = await db.timetableEntry.findMany({
    where: { sectionId },
    include: { subject: { select: { name: true, code: true } }, teacher: { include: { user: { select: { firstName: true, lastName: true } } } } },
  });
  const grid = {} as Record<Weekday, TimetableEntryView[]>;
  for (const e of entries) {
    const view: TimetableEntryView = {
      id: e.id,
      day: e.day,
      startTime: e.startTime,
      endTime: e.endTime,
      room: e.room,
      subjectId: e.subjectId,
      subject: e.subject.name,
      subjectCode: e.subject.code,
      teacherId: e.teacherId,
      teacher: e.teacher ? `${e.teacher.user.firstName} ${e.teacher.user.lastName}` : null,
    };
    (grid[e.day] ??= []).push(view);
  }
  for (const day of Object.keys(grid) as Weekday[]) {
    grid[day].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }
  return grid;
}

/** Resolve the section a student/parent should see (own section / first child's). */
export async function getDefaultSectionId(user: SessionUser): Promise<string | null> {
  if (user.role === "STUDENT") {
    const e = await db.enrollment.findFirst({
      where: { student: { userId: user.id }, deletedAt: null, academicYear: { status: "ACTIVE" } },
      select: { sectionId: true },
    });
    return e?.sectionId ?? null;
  }
  if (user.role === "PARENT") {
    const sg = await db.studentGuardian.findFirst({
      where: { guardian: { userId: user.id } },
      include: { student: { include: { enrollments: { where: { deletedAt: null, academicYear: { status: "ACTIVE" } }, select: { sectionId: true } } } } },
    });
    return sg?.student.enrollments[0]?.sectionId ?? null;
  }
  return null;
}

/** Subjects + teachers (scoped to a section's school) for the entry form. */
export async function getEntryFormData(schoolId: string) {
  const [subjects, teachers] = await Promise.all([
    db.subject.findMany({ where: { schoolId, deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, code: true } }),
    db.teacher.findMany({ where: { schoolId, deletedAt: null, user: { deletedAt: null } }, include: { user: true }, orderBy: { user: { firstName: "asc" } } }),
  ]);
  return {
    subjects: subjects.map((s) => ({ id: s.id, label: `${s.name} · ${s.code}` })),
    teachers: teachers.map((t) => ({ id: t.id, label: `${t.user.firstName} ${t.user.lastName} · ${t.employeeId}` })),
  };
}
