import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/types";

const PAGE_SIZE = 10;

function scope(user: SessionUser): Prisma.BookWhereInput {
  const base: Prisma.BookWhereInput = { deletedAt: null };
  if (user.role !== "SUPER_ADMIN") base.schoolId = user.schoolId ?? "__none__";
  return base;
}

export interface ListBooksParams {
  q?: string;
  category?: string;
  page?: number;
}

export async function listBooks(user: SessionUser, params: ListBooksParams) {
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.BookWhereInput = { ...scope(user) };
  if (params.category) where.category = params.category;
  if (params.q) {
    const q = params.q.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { author: { contains: q, mode: "insensitive" } },
      { isbn: { contains: q, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    db.book.findMany({ where, orderBy: { title: "asc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.book.count({ where }),
  ]);
  return { rows, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getLibraryStats(user: SessionUser) {
  const where = scope(user);
  const [titles, copies, overdue] = await Promise.all([
    db.book.count({ where }),
    db.book.aggregate({ where, _sum: { totalCopies: true, availableCopies: true } }),
    db.bookLoan.count({
      where: { status: "BORROWED", dueDate: { lt: new Date() }, book: where },
    }),
  ]);
  const totalCopies = copies._sum.totalCopies ?? 0;
  const available = copies._sum.availableCopies ?? 0;
  return { titles, totalCopies, issued: Math.max(0, totalCopies - available), overdue };
}

/** Distinct non-empty categories for the filter. */
export async function getBookCategories(user: SessionUser): Promise<string[]> {
  const where = scope(user);
  const rows = await db.book.findMany({ where: { ...where, category: { not: null } }, distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } });
  return rows.map((r) => r.category!).filter(Boolean);
}

export async function getBook(user: SessionUser, id: string) {
  return db.book.findFirst({
    where: { id, ...scope(user) },
    include: {
      loans: {
        where: { status: "BORROWED" },
        include: { member: { select: { firstName: true, lastName: true, role: true } } },
        orderBy: { dueDate: "asc" },
      },
    },
  });
}

/** Library members (students + teachers) available to issue books to. */
export async function getLibraryMembers(user: SessionUser) {
  const where: Prisma.UserWhereInput = { deletedAt: null, status: "ACTIVE", role: { in: ["STUDENT", "TEACHER"] } };
  if (user.role !== "SUPER_ADMIN") where.schoolId = user.schoolId ?? "__none__";
  const members = await db.user.findMany({ where, orderBy: { firstName: "asc" }, take: 1000 });
  return members.map((m) => ({ id: m.id, label: `${m.firstName} ${m.lastName} · ${m.role === "TEACHER" ? "Teacher" : "Student"}` }));
}

/** A member's loans (for the student "my books" view). */
export async function getMemberLoans(userId: string) {
  return db.bookLoan.findMany({
    where: { memberId: userId },
    include: { book: { select: { title: true, author: true } } },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    take: 50,
  });
}
