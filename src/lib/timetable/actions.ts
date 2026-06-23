"use server";

import { revalidatePath } from "next/cache";
import type { Weekday } from "@prisma/client";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/rbac/authorize";
import { audit } from "@/lib/audit";
import { entrySchema, formToObject } from "@/lib/timetable/validation";
import { overlaps } from "@/lib/timetable/display";

export interface EntryState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

function zodToFieldErrors(error: import("zod").ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

type SessionUserT = Awaited<ReturnType<typeof requireUser>>;

function classScope(user: SessionUserT) {
  return user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {};
}

/** Detect a clash with another period for the same section or the same teacher. */
async function findConflict(opts: {
  schoolId: string;
  sectionId: string;
  teacherId: string | null;
  day: Weekday;
  startTime: string;
  endTime: string;
  excludeId?: string;
}): Promise<string | null> {
  const notSelf = opts.excludeId ? { id: { not: opts.excludeId } } : {};

  const sectionEntries = await db.timetableEntry.findMany({ where: { sectionId: opts.sectionId, day: opts.day, ...notSelf } });
  if (sectionEntries.some((e) => overlaps(opts.startTime, opts.endTime, e.startTime, e.endTime))) {
    return "This section already has a period during that time.";
  }

  if (opts.teacherId) {
    const teacherEntries = await db.timetableEntry.findMany({ where: { teacherId: opts.teacherId, day: opts.day, schoolId: opts.schoolId, ...notSelf } });
    if (teacherEntries.some((e) => overlaps(opts.startTime, opts.endTime, e.startTime, e.endTime))) {
      return "That teacher is already teaching another class during that time.";
    }
  }
  return null;
}

async function resolveTargets(user: SessionUserT, sectionId: string, subjectId: string, teacherId?: string) {
  const section = await db.section.findFirst({ where: { id: sectionId, deletedAt: null, class: { deletedAt: null, ...classScope(user) } }, include: { class: true } });
  if (!section) return { error: "Select a valid section." };
  const schoolId = section.class.schoolId;
  const subject = await db.subject.findFirst({ where: { id: subjectId, deletedAt: null, schoolId } });
  if (!subject) return { error: "Select a subject from the same school." };
  let resolvedTeacher: string | null = null;
  if (teacherId) {
    const teacher = await db.teacher.findFirst({ where: { id: teacherId, deletedAt: null, schoolId } });
    if (!teacher) return { error: "Select a teacher from the same school." };
    resolvedTeacher = teacher.id;
  }
  return { schoolId, teacherId: resolvedTeacher };
}

export async function createEntryAction(_prev: EntryState, formData: FormData): Promise<EntryState> {
  const user = await requireUser();
  if (!can(user, "timetable:manage")) return { error: "You don't have permission to edit the timetable." };

  const parsed = entrySchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const d = parsed.data;

  const t = await resolveTargets(user, d.sectionId, d.subjectId, d.teacherId);
  if (t.error || !t.schoolId) return { error: t.error };

  const conflict = await findConflict({ schoolId: t.schoolId, sectionId: d.sectionId, teacherId: t.teacherId ?? null, day: d.day, startTime: d.startTime, endTime: d.endTime });
  if (conflict) return { error: conflict };

  const entry = await db.timetableEntry.create({
    data: { schoolId: t.schoolId, sectionId: d.sectionId, subjectId: d.subjectId, teacherId: t.teacherId, day: d.day, startTime: d.startTime, endTime: d.endTime, room: d.room },
  });
  await audit({ action: "timetable.create", userId: user.id, schoolId: t.schoolId, entityType: "TimetableEntry", entityId: entry.id, metadata: { sectionId: d.sectionId, day: d.day } });

  revalidatePath("/dashboard/timetable");
  return { ok: true };
}

export async function updateEntryAction(_prev: EntryState, formData: FormData): Promise<EntryState> {
  const user = await requireUser();
  if (!can(user, "timetable:manage")) return { error: "You don't have permission to edit the timetable." };

  const id = String(formData.get("id") ?? "");
  const existing = await db.timetableEntry.findFirst({ where: { id, ...classScope(user) } });
  if (!existing) return { error: "Period not found." };

  const parsed = entrySchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const d = parsed.data;

  const t = await resolveTargets(user, d.sectionId, d.subjectId, d.teacherId);
  if (t.error || !t.schoolId) return { error: t.error };

  const conflict = await findConflict({ schoolId: t.schoolId, sectionId: d.sectionId, teacherId: t.teacherId ?? null, day: d.day, startTime: d.startTime, endTime: d.endTime, excludeId: id });
  if (conflict) return { error: conflict };

  await db.timetableEntry.update({
    where: { id },
    data: { sectionId: d.sectionId, subjectId: d.subjectId, teacherId: t.teacherId, day: d.day, startTime: d.startTime, endTime: d.endTime, room: d.room },
  });
  await audit({ action: "timetable.update", userId: user.id, schoolId: t.schoolId, entityType: "TimetableEntry", entityId: id });

  revalidatePath("/dashboard/timetable");
  return { ok: true };
}

export async function deleteEntryAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "timetable:manage")) return;

  const id = String(formData.get("id") ?? "");
  const existing = await db.timetableEntry.findFirst({ where: { id, ...classScope(user) } });
  if (!existing) return;

  await db.timetableEntry.delete({ where: { id } });
  await audit({ action: "timetable.delete", userId: user.id, schoolId: existing.schoolId, entityType: "TimetableEntry", entityId: id });

  revalidatePath("/dashboard/timetable");
}
