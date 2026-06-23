import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/types";

const PAGE_SIZE = 10;

function scope(user: SessionUser): Prisma.ReportSubmissionWhereInput {
  return user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {};
}

export async function listReportSubmissions(user: SessionUser, params: { page?: number } = {}) {
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.ReportSubmissionWhereInput = { deletedAt: null, ...scope(user) };
  const [rows, total] = await Promise.all([
    db.reportSubmission.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.reportSubmission.count({ where }),
  ]);
  return { rows, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getReportSubmission(user: SessionUser, id: string) {
  return db.reportSubmission.findFirst({ where: { id, deletedAt: null, ...scope(user) } });
}

/** Count of submissions awaiting review — used for the reports-page badge. */
export async function pendingReportCount(user: SessionUser): Promise<number> {
  return db.reportSubmission.count({ where: { deletedAt: null, status: "SUBMITTED", ...scope(user) } });
}
