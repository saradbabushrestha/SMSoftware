"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/rbac/authorize";
import { audit } from "@/lib/audit";
import { bookSchema, issueSchema, formToObject } from "@/lib/library/validation";

export interface BookFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export interface IssueState {
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

function bookScope(user: SessionUserT) {
  return user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {};
}

export async function createBookAction(_prev: BookFormState, formData: FormData): Promise<BookFormState> {
  const user = await requireUser();
  if (!can(user, "library:manage")) return { error: "You don't have permission to manage the library." };
  if (!user.schoolId && user.role !== "SUPER_ADMIN") return { error: "No school associated with your account." };

  const parsed = bookSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const data = parsed.data;

  // Super admin needs a school; resolve from an explicit field.
  let schoolId = user.schoolId ?? undefined;
  if (user.role === "SUPER_ADMIN") {
    const sid = String(formData.get("schoolId") ?? "");
    const school = sid ? await db.school.findFirst({ where: { id: sid, deletedAt: null } }) : null;
    if (!school) return { error: "Select a school for this book." };
    schoolId = school.id;
  }
  if (!schoolId) return { error: "No school associated with your account." };

  const book = await db.book.create({
    data: {
      schoolId,
      title: data.title,
      author: data.author,
      isbn: data.isbn,
      category: data.category,
      totalCopies: data.totalCopies,
      availableCopies: data.totalCopies,
    },
  });
  await audit({ action: "book.create", userId: user.id, schoolId, entityType: "Book", entityId: book.id, metadata: { title: data.title } });

  revalidatePath("/dashboard/library");
  redirect(`/dashboard/library/${book.id}`);
}

export async function updateBookAction(_prev: BookFormState, formData: FormData): Promise<BookFormState> {
  const user = await requireUser();
  if (!can(user, "library:manage")) return { error: "You don't have permission to manage the library." };

  const id = String(formData.get("id") ?? "");
  const existing = await db.book.findFirst({ where: { id, deletedAt: null, ...bookScope(user) } });
  if (!existing) return { error: "Book not found." };

  const parsed = bookSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const data = parsed.data;

  // Keep availableCopies consistent when totalCopies changes.
  const onLoan = existing.totalCopies - existing.availableCopies;
  if (data.totalCopies < onLoan) {
    return { fieldErrors: { totalCopies: `At least ${onLoan} copies are on loan.` } };
  }
  const availableCopies = data.totalCopies - onLoan;

  await db.book.update({
    where: { id },
    data: { title: data.title, author: data.author, isbn: data.isbn, category: data.category, totalCopies: data.totalCopies, availableCopies },
  });
  await audit({ action: "book.update", userId: user.id, schoolId: existing.schoolId, entityType: "Book", entityId: id });

  revalidatePath("/dashboard/library");
  revalidatePath(`/dashboard/library/${id}`);
  redirect(`/dashboard/library/${id}`);
}

export async function deleteBookAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "library:manage")) return;

  const id = String(formData.get("id") ?? "");
  const existing = await db.book.findFirst({ where: { id, deletedAt: null, ...bookScope(user) } });
  if (!existing) return;

  await db.book.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ action: "book.delete", userId: user.id, schoolId: existing.schoolId, entityType: "Book", entityId: id });

  revalidatePath("/dashboard/library");
  redirect("/dashboard/library");
}

export async function issueBookAction(_prev: IssueState, formData: FormData): Promise<IssueState> {
  const user = await requireUser();
  if (!can(user, "library:manage")) return { error: "You don't have permission to issue books." };

  const bookId = String(formData.get("bookId") ?? "");
  const book = await db.book.findFirst({ where: { id: bookId, deletedAt: null, ...bookScope(user) } });
  if (!book) return { error: "Book not found." };
  if (book.availableCopies <= 0) return { error: "No copies available to issue." };

  const parsed = issueSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const { memberId, dueDate } = parsed.data;

  const member = await db.user.findFirst({
    where: { id: memberId, deletedAt: null, role: { in: ["STUDENT", "TEACHER"] }, schoolId: book.schoolId },
  });
  if (!member) return { fieldErrors: { memberId: "Select a valid member from this school." } };

  await db.$transaction([
    db.bookLoan.create({ data: { schoolId: book.schoolId, bookId, memberId, dueDate, status: "BORROWED" } }),
    db.book.update({ where: { id: bookId }, data: { availableCopies: { decrement: 1 } } }),
  ]);
  await audit({ action: "book.issue", userId: user.id, schoolId: book.schoolId, entityType: "Book", entityId: bookId, metadata: { memberId } });

  revalidatePath(`/dashboard/library/${bookId}`);
  revalidatePath("/dashboard/library");
  return { ok: true };
}

export async function returnBookAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "library:manage")) return;

  const loanId = String(formData.get("loanId") ?? "");
  const loan = await db.bookLoan.findFirst({
    where: { id: loanId, status: "BORROWED", book: { deletedAt: null, ...bookScope(user) } },
    include: { book: true },
  });
  if (!loan) return;

  await db.$transaction([
    db.bookLoan.update({ where: { id: loanId }, data: { status: "RETURNED", returnedAt: new Date() } }),
    db.book.update({
      where: { id: loan.bookId },
      // Never exceed total copies.
      data: { availableCopies: Math.min(loan.book.totalCopies, loan.book.availableCopies + 1) },
    }),
  ]);
  await audit({ action: "book.return", userId: user.id, schoolId: loan.schoolId, entityType: "Book", entityId: loan.bookId, metadata: { loanId } });

  revalidatePath(`/dashboard/library/${loan.bookId}`);
  revalidatePath("/dashboard/library");
}
