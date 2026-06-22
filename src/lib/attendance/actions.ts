"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type AttendanceStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/rbac/authorize";
import { audit } from "@/lib/audit";
import { parseDateParam } from "@/lib/attendance/display";

export interface MarkAttendanceState {
  ok?: boolean;
  error?: string;
  saved?: number;
}

const VALID: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "LEAVE"];

export async function markAttendanceAction(
  _prev: MarkAttendanceState,
  formData: FormData,
): Promise<MarkAttendanceState> {
  const user = await requireUser();
  if (!can(user, "attendance:mark")) return { error: "You don't have permission to mark attendance." };

  const sectionId = String(formData.get("sectionId") ?? "");
  const dateStr = String(formData.get("date") ?? "");
  const date = parseDateParam(dateStr);

  const scope: Prisma.SchoolClassWhereInput = { deletedAt: null };
  if (user.role !== "SUPER_ADMIN") scope.schoolId = user.schoolId ?? "__none__";

  const section = await db.section.findFirst({
    where: { id: sectionId, deletedAt: null, class: scope },
    include: { class: true },
  });
  if (!section) return { error: "Section not found." };
  const schoolId = section.class.schoolId;

  // Only accept statuses for students actually enrolled in this section (active year).
  const enrollments = await db.enrollment.findMany({
    where: { sectionId, deletedAt: null, academicYear: { status: "ACTIVE" }, student: { deletedAt: null } },
    select: { studentId: true },
  });
  const enrolledIds = new Set(enrollments.map((e) => e.studentId));

  const updates: { studentId: string; status: AttendanceStatus }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("status_")) continue;
    const studentId = key.slice("status_".length);
    const status = String(value) as AttendanceStatus;
    if (enrolledIds.has(studentId) && VALID.includes(status)) {
      updates.push({ studentId, status });
    }
  }

  if (updates.length === 0) return { error: "No students to record." };

  await db.$transaction(
    updates.map((u) =>
      db.attendance.upsert({
        where: { studentId_date: { studentId: u.studentId, date } },
        update: { status: u.status, sectionId, markedById: user.id },
        create: { schoolId, sectionId, studentId: u.studentId, date, status: u.status, markedById: user.id },
      }),
    ),
  );

  await audit({
    action: "attendance.mark",
    userId: user.id,
    schoolId,
    entityType: "Section",
    entityId: sectionId,
    metadata: { date: dateStr, count: updates.length },
  });

  revalidatePath("/dashboard/attendance");
  return { ok: true, saved: updates.length };
}
