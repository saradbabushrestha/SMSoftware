import "server-only";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac/authorize";
import type { SessionUser } from "@/lib/auth/types";

export type SearchKind = "student" | "teacher" | "class" | "invoice";

export interface SearchResult {
  kind: SearchKind;
  label: string;
  sublabel: string;
  href: string;
}

/**
 * Permission-aware, school-scoped global search. People/finance results are
 * limited to staff (students/parents hold those :view perms only row-scoped,
 * so we don't expose a school-wide search to them).
 */
export async function globalSearch(user: SessionUser, query: string): Promise<SearchResult[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  const isStaff = user.role !== "STUDENT" && user.role !== "PARENT";
  const school = user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {};
  const ci = { contains: term, mode: "insensitive" as const };
  const results: SearchResult[] = [];
  const tasks: Promise<void>[] = [];

  if (isStaff && can(user, "student:view")) {
    tasks.push(
      db.student
        .findMany({
          where: { deletedAt: null, ...school, OR: [{ user: { firstName: ci } }, { user: { lastName: ci } }, { admissionNumber: ci }] },
          include: { user: true },
          take: 5,
          orderBy: { admissionNumber: "asc" },
        })
        .then((rows) => {
          for (const s of rows) results.push({ kind: "student", label: `${s.user.firstName} ${s.user.lastName}`, sublabel: s.admissionNumber, href: `/dashboard/students/${s.id}` });
        }),
    );
  }

  if (isStaff && can(user, "teacher:view")) {
    tasks.push(
      db.teacher
        .findMany({
          where: { deletedAt: null, ...school, OR: [{ user: { firstName: ci } }, { user: { lastName: ci } }, { employeeId: ci }] },
          include: { user: true },
          take: 5,
          orderBy: { employeeId: "asc" },
        })
        .then((rows) => {
          for (const t of rows) results.push({ kind: "teacher", label: `${t.user.firstName} ${t.user.lastName}`, sublabel: t.employeeId, href: `/dashboard/teachers/${t.id}` });
        }),
    );
  }

  if (can(user, "class:view")) {
    tasks.push(
      db.schoolClass
        .findMany({ where: { deletedAt: null, ...school, OR: [{ name: ci }, { code: ci }] }, take: 5, orderBy: { name: "asc" } })
        .then((rows) => {
          for (const c of rows) results.push({ kind: "class", label: c.name, sublabel: c.code, href: `/dashboard/classes/${c.id}` });
        }),
    );
  }

  if (isStaff && can(user, "fee:view")) {
    tasks.push(
      db.invoice
        .findMany({ where: { deletedAt: null, ...school, title: ci }, include: { student: { include: { user: true } } }, take: 5, orderBy: { createdAt: "desc" } })
        .then((rows) => {
          for (const i of rows) results.push({ kind: "invoice", label: i.title, sublabel: `${i.student.user.firstName} ${i.student.user.lastName}`, href: `/dashboard/fees/${i.id}` });
        }),
    );
  }

  await Promise.all(tasks);
  return results;
}
