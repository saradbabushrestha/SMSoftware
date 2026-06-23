import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/types";
import { audienceForRole } from "@/lib/announcements/display";

const PAGE_SIZE = 10;

function scope(user: SessionUser): Prisma.AnnouncementWhereInput {
  return user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {};
}

/**
 * What a given user is allowed to see.
 * Managers (`manage`) see everything in their school — every audience, incl.
 * expired notices. Everyone else sees only notices targeted at them (or ALL)
 * that haven't expired.
 */
function visibilityWhere(user: SessionUser, manage: boolean): Prisma.AnnouncementWhereInput {
  const base: Prisma.AnnouncementWhereInput = { deletedAt: null, ...scope(user) };
  if (manage) return base;
  return {
    ...base,
    audience: { in: ["ALL", audienceForRole(user.role)] },
    OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
  };
}

export async function listAnnouncements(user: SessionUser, params: { page?: number; manage: boolean }) {
  const page = Math.max(1, params.page ?? 1);
  const where = visibilityWhere(user, params.manage);

  const [rows, total] = await Promise.all([
    db.announcement.findMany({
      where,
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.announcement.count({ where }),
  ]);
  return { rows, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getAnnouncementStats(user: SessionUser, manage: boolean) {
  const where = visibilityWhere(user, manage);
  const [total, pinned] = await Promise.all([
    db.announcement.count({ where }),
    db.announcement.count({ where: { ...where, pinned: true } }),
  ]);
  return { total, pinned };
}

export async function getAnnouncement(user: SessionUser, id: string, manage: boolean) {
  return db.announcement.findFirst({ where: { id, ...visibilityWhere(user, manage) } });
}
