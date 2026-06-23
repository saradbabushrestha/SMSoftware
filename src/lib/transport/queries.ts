import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/types";

const PAGE_SIZE = 10;

function scope(user: SessionUser): Prisma.RouteWhereInput {
  const base: Prisma.RouteWhereInput = { deletedAt: null };
  if (user.role !== "SUPER_ADMIN") base.schoolId = user.schoolId ?? "__none__";
  return base;
}

export interface ListRoutesParams {
  q?: string;
  page?: number;
}

export async function listRoutes(user: SessionUser, params: ListRoutesParams) {
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.RouteWhereInput = { ...scope(user) };
  if (params.q) {
    const q = params.q.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { vehicleNumber: { contains: q, mode: "insensitive" } },
      { driverName: { contains: q, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    db.route.findMany({ where, include: { _count: { select: { assignments: true } } }, orderBy: { name: "asc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.route.count({ where }),
  ]);
  return { rows, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getTransportStats(user: SessionUser) {
  const where = scope(user);
  const [routes, withVehicle, assigned] = await Promise.all([
    db.route.count({ where }),
    db.route.count({ where: { ...where, vehicleNumber: { not: null } } }),
    db.transportAssignment.count({ where: { route: where } }),
  ]);
  return { routes, vehicles: withVehicle, assigned };
}

export async function getRoute(user: SessionUser, id: string) {
  return db.route.findFirst({
    where: { id, ...scope(user) },
    include: {
      assignments: {
        include: { student: { include: { user: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

/** Students in a school who aren't yet assigned to any route. */
export async function getUnassignedStudents(schoolId: string) {
  const students = await db.student.findMany({
    where: { schoolId, deletedAt: null, transportAssignments: { none: {} } },
    include: { user: true },
    orderBy: { user: { firstName: "asc" } },
    take: 500,
  });
  return students.map((s) => ({ id: s.id, label: `${s.user.firstName} ${s.user.lastName} · ${s.admissionNumber}` }));
}
