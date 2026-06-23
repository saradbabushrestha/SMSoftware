"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/rbac/authorize";
import { audit } from "@/lib/audit";
import { roomSchema, assignSchema, formToObject } from "@/lib/hostel/validation";

export interface RoomFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export interface AssignState {
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

function roomScope(user: SessionUserT) {
  return user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {};
}

export async function createRoomAction(_prev: RoomFormState, formData: FormData): Promise<RoomFormState> {
  const user = await requireUser();
  if (!can(user, "hostel:manage")) return { error: "You don't have permission to manage the hostel." };

  const parsed = roomSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };

  let schoolId = user.schoolId ?? undefined;
  if (user.role === "SUPER_ADMIN") {
    const sid = String(formData.get("schoolId") ?? "");
    const school = sid ? await db.school.findFirst({ where: { id: sid, deletedAt: null } }) : null;
    if (!school) return { fieldErrors: { schoolId: "Select a school." } };
    schoolId = school.id;
  }
  if (!schoolId) return { error: "No school associated with your account." };

  const room = await db.room.create({ data: { schoolId, ...parsed.data } });
  await audit({ action: "room.create", userId: user.id, schoolId, entityType: "Room", entityId: room.id, metadata: { block: parsed.data.block, number: parsed.data.number } });

  revalidatePath("/dashboard/hostel");
  redirect(`/dashboard/hostel/${room.id}`);
}

export async function updateRoomAction(_prev: RoomFormState, formData: FormData): Promise<RoomFormState> {
  const user = await requireUser();
  if (!can(user, "hostel:manage")) return { error: "You don't have permission to manage the hostel." };

  const id = String(formData.get("id") ?? "");
  const existing = await db.room.findFirst({ where: { id, deletedAt: null, ...roomScope(user) } });
  if (!existing) return { error: "Room not found." };

  const parsed = roomSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };

  const occupied = await db.roomAssignment.count({ where: { roomId: id } });
  if (parsed.data.capacity < occupied) return { fieldErrors: { capacity: `${occupied} bed(s) are occupied.` } };

  await db.room.update({ where: { id }, data: parsed.data });
  await audit({ action: "room.update", userId: user.id, schoolId: existing.schoolId, entityType: "Room", entityId: id });

  revalidatePath("/dashboard/hostel");
  revalidatePath(`/dashboard/hostel/${id}`);
  redirect(`/dashboard/hostel/${id}`);
}

export async function deleteRoomAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "hostel:manage")) return;

  const id = String(formData.get("id") ?? "");
  const existing = await db.room.findFirst({ where: { id, deletedAt: null, ...roomScope(user) } });
  if (!existing) return;

  await db.room.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ action: "room.delete", userId: user.id, schoolId: existing.schoolId, entityType: "Room", entityId: id });

  revalidatePath("/dashboard/hostel");
  redirect("/dashboard/hostel");
}

export async function assignRoomAction(_prev: AssignState, formData: FormData): Promise<AssignState> {
  const user = await requireUser();
  if (!can(user, "hostel:manage")) return { error: "You don't have permission." };

  const roomId = String(formData.get("roomId") ?? "");
  const room = await db.room.findFirst({ where: { id: roomId, deletedAt: null, ...roomScope(user) }, include: { _count: { select: { assignments: true } } } });
  if (!room) return { error: "Room not found." };

  const parsed = assignSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const { studentId, bedNumber } = parsed.data;

  const student = await db.student.findFirst({ where: { id: studentId, deletedAt: null, schoolId: room.schoolId } });
  if (!student) return { fieldErrors: { studentId: "Select a valid student from this school." } };

  const already = await db.roomAssignment.findUnique({ where: { studentId } });
  if (!already && room.capacity > 0 && room._count.assignments >= room.capacity) {
    return { error: "This room is full." };
  }

  await db.roomAssignment.upsert({ where: { studentId }, update: { roomId, bedNumber }, create: { roomId, studentId, bedNumber } });
  await audit({ action: "hostel.assign", userId: user.id, schoolId: room.schoolId, entityType: "Room", entityId: roomId, metadata: { studentId } });

  revalidatePath(`/dashboard/hostel/${roomId}`);
  revalidatePath("/dashboard/hostel");
  return { ok: true };
}

export async function unassignRoomAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "hostel:manage")) return;

  const assignmentId = String(formData.get("assignmentId") ?? "");
  const assignment = await db.roomAssignment.findFirst({ where: { id: assignmentId, room: { deletedAt: null, ...roomScope(user) } }, include: { room: true } });
  if (!assignment) return;

  await db.roomAssignment.delete({ where: { id: assignmentId } });
  await audit({ action: "hostel.unassign", userId: user.id, schoolId: assignment.room.schoolId, entityType: "Room", entityId: assignment.roomId, metadata: { studentId: assignment.studentId } });

  revalidatePath(`/dashboard/hostel/${assignment.roomId}`);
  revalidatePath("/dashboard/hostel");
}
