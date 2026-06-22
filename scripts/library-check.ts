// Data-layer invariants for the Library module (copy counts, fines, issue/return).
import { PrismaClient } from "@prisma/client";
import { fineFor, FINE_PER_DAY } from "../src/lib/library/display";

const db = new PrismaClient();

async function main() {
  let ok = true;
  const log = (label: string, pass: boolean, extra = "") => {
    console.log(`${pass ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
    if (!pass) ok = false;
  };

  const school = await db.school.findUniqueOrThrow({ where: { code: "GHS" } });
  const student = await db.user.findFirstOrThrow({ where: { email: "student@greenwood.edu" } });
  const teacher = await db.user.findFirstOrThrow({ where: { email: "teacher@greenwood.edu" } });

  log("seeded books present", (await db.book.count({ where: { schoolId: school.id, deletedAt: null } })) >= 5);
  log("seeded loans present", (await db.bookLoan.count({ where: { schoolId: school.id } })) >= 1);

  // Fine maths (pure)
  log("fine = days × rate", fineFor(new Date(Date.now() - 7 * 86400000), null) === 7 * FINE_PER_DAY, `${7 * FINE_PER_DAY}`);
  log("no fine before due date", fineFor(new Date(Date.now() + 3 * 86400000), null) === 0);

  // Temp book lifecycle
  const book = await db.book.create({ data: { schoolId: school.id, title: "ZZ Temp Book", author: "Tester", totalCopies: 2, availableCopies: 2 } });

  const issue = async (memberId: string, dueDate: Date) =>
    db.$transaction(async (tx) => {
      const loan = await tx.bookLoan.create({ data: { schoolId: school.id, bookId: book.id, memberId, dueDate, status: "BORROWED" } });
      await tx.book.update({ where: { id: book.id }, data: { availableCopies: { decrement: 1 } } });
      return loan;
    });

  const loan1 = await issue(student.id, new Date(Date.now() + 14 * 86400000));
  await issue(teacher.id, new Date(Date.now() - 10 * 86400000));
  let b = await db.book.findUniqueOrThrow({ where: { id: book.id } });
  log("issuing decrements available copies", b.availableCopies === 0, `${b.availableCopies}/2`);

  // Return loan1 → status RETURNED + available back up
  await db.$transaction([
    db.bookLoan.update({ where: { id: loan1.id }, data: { status: "RETURNED", returnedAt: new Date() } }),
    db.book.update({ where: { id: book.id }, data: { availableCopies: { increment: 1 } } }),
  ]);
  b = await db.book.findUniqueOrThrow({ where: { id: book.id } });
  const returned = await db.bookLoan.findUniqueOrThrow({ where: { id: loan1.id } });
  log("return restores a copy", b.availableCopies === 1);
  log("returned loan marked RETURNED + dated", returned.status === "RETURNED" && returned.returnedAt !== null);

  // Cleanup (deleting the book cascades to its loans)
  await db.book.delete({ where: { id: book.id } });
  log("book delete cascades to loans", (await db.bookLoan.count({ where: { bookId: book.id } })) === 0);

  console.log(ok ? "\n✅ LIBRARY DATA-LAYER CHECKS PASSED" : "\n❌ SOME CHECKS FAILED");
  if (!ok) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
