import "server-only";
import { Prisma, type EventType } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/types";

const PAGE_SIZE = 12;

function scope(user: SessionUser): Prisma.EventWhereInput {
  const base: Prisma.EventWhereInput = { deletedAt: null };
  if (user.role !== "SUPER_ADMIN") base.schoolId = user.schoolId ?? "__none__";
  return base;
}

export interface ListEventsParams {
  type?: EventType;
  when?: string; // "upcoming" | "past" | "all"
  page?: number;
}

export async function listEvents(user: SessionUser, params: ListEventsParams) {
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.EventWhereInput = { ...scope(user) };
  if (params.type) where.type = params.type;

  const now = new Date();
  const past = params.when === "past";
  if (params.when !== "all") where.startsAt = past ? { lt: now } : { gte: now };

  const [rows, total] = await Promise.all([
    db.event.findMany({
      where,
      include: { _count: { select: { registrations: true } } },
      orderBy: { startsAt: past ? "desc" : "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.event.count({ where }),
  ]);

  return { rows, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getEventStats(user: SessionUser) {
  const base = scope(user);
  const now = new Date();
  const [total, upcoming, registered] = await Promise.all([
    db.event.count({ where: base }),
    db.event.count({ where: { ...base, startsAt: { gte: now } } }),
    db.eventRegistration.count({ where: { userId: user.id, event: base } }),
  ]);
  return { total, upcoming, registered };
}

export async function getEvent(user: SessionUser, id: string) {
  const event = await db.event.findFirst({
    where: { id, ...scope(user) },
    include: { _count: { select: { registrations: true } }, createdBy: { select: { firstName: true, lastName: true } } },
  });
  if (!event) return null;
  const mine = await db.eventRegistration.findUnique({
    where: { eventId_userId: { eventId: id, userId: user.id } },
  });
  return { ...event, registeredCount: event._count.registrations, isRegistered: !!mine };
}

export async function getEventAttendees(eventId: string) {
  const regs = await db.eventRegistration.findMany({
    where: { eventId },
    include: { user: { select: { firstName: true, lastName: true, role: true } } },
    orderBy: { createdAt: "asc" },
    take: 1000,
  });
  return regs.map((r) => ({ id: r.id, name: `${r.user.firstName} ${r.user.lastName}`, role: r.user.role, at: r.createdAt }));
}
