import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/types";

const PAGE_SIZE = 10;

function scope(user: SessionUser): Prisma.RoomWhereInput {
  const base: Prisma.RoomWhereInput = { deletedAt: null };
  if (user.role !== "SUPER_ADMIN") base.schoolId = user.schoolId ?? "__none__";
  return base;
}

export interface ListRoomsParams {
  q?: string;
  page?: number;
}

export async function listRooms(user: SessionUser, params: ListRoomsParams) {
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.RoomWhereInput = { ...scope(user) };
  if (params.q) {
    const q = params.q.trim();
    where.OR = [
      { block: { contains: q, mode: "insensitive" } },
      { number: { contains: q, mode: "insensitive" } },
      { wardenName: { contains: q, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    db.room.findMany({ where, include: { _count: { select: { assignments: true } } }, orderBy: [{ block: "asc" }, { number: "asc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.room.count({ where }),
  ]);
  return { rows, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getHostelStats(user: SessionUser) {
  const where = scope(user);
  const [rooms, beds, occupied] = await Promise.all([
    db.room.count({ where }),
    db.room.aggregate({ where, _sum: { capacity: true } }),
    db.roomAssignment.count({ where: { room: where } }),
  ]);
  return { rooms, beds: beds._sum.capacity ?? 0, occupied };
}

export async function getRoom(user: SessionUser, id: string) {
  return db.room.findFirst({
    where: { id, ...scope(user) },
    include: { assignments: { include: { student: { include: { user: true } } }, orderBy: { createdAt: "asc" } } },
  });
}

/** Students in a school not yet assigned to a hostel room. */
export async function getUnassignedStudents(schoolId: string) {
  const students = await db.student.findMany({
    where: { schoolId, deletedAt: null, roomAssignments: { none: {} } },
    include: { user: true },
    orderBy: { user: { firstName: "asc" } },
    take: 500,
  });
  return students.map((s) => ({ id: s.id, label: `${s.user.firstName} ${s.user.lastName} · ${s.admissionNumber}` }));
}
