// Data-layer invariants for the Accounting (ledger) module.
import { PrismaClient } from "@prisma/client";
import { getRolePermissions } from "../src/lib/rbac/permissions";

const db = new PrismaClient();

async function main() {
  let ok = true;
  const log = (label: string, pass: boolean, extra = "") => {
    console.log(`${pass ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
    if (!pass) ok = false;
  };

  const school = await db.school.findUniqueOrThrow({ where: { code: "GHS" } });

  // Seeded ledger present, scoped & attributed.
  const entries = await db.ledgerEntry.findMany({ where: { schoolId: school.id, deletedAt: null } });
  log("seeded ledger entries present", entries.length >= 7, String(entries.length));
  log("every entry is school-scoped", entries.every((e) => e.schoolId === school.id));
  log("every entry has a recorder", entries.every((e) => !!e.createdById));
  log("has both income & expense", entries.some((e) => e.type === "INCOME") && entries.some((e) => e.type === "EXPENSE"));

  // P&L: net = income − expense, matching DB aggregates.
  const income = entries.filter((e) => e.type === "INCOME").reduce((a, e) => a + e.amount, 0);
  const expense = entries.filter((e) => e.type === "EXPENSE").reduce((a, e) => a + e.amount, 0);
  const aggInc = (await db.ledgerEntry.aggregate({ where: { schoolId: school.id, deletedAt: null, type: "INCOME" }, _sum: { amount: true } }))._sum.amount ?? 0;
  const aggExp = (await db.ledgerEntry.aggregate({ where: { schoolId: school.id, deletedAt: null, type: "EXPENSE" }, _sum: { amount: true } }))._sum.amount ?? 0;
  log("income aggregate matches", Math.round(aggInc) === Math.round(income), income.toLocaleString());
  log("expense aggregate matches", Math.round(aggExp) === Math.round(expense), expense.toLocaleString());
  log("net P&L = income − expense", Math.round(income - expense) === Math.round(aggInc - aggExp), (income - expense).toLocaleString());

  // Soft delete: a deleted entry drops out of the active ledger and the P&L.
  const fresh = await db.ledgerEntry.create({ data: { schoolId: school.id, type: "EXPENSE", category: "ZZ Test", amount: 999, date: new Date(), createdById: entries[0].createdById } });
  const beforeExp = (await db.ledgerEntry.aggregate({ where: { schoolId: school.id, deletedAt: null, type: "EXPENSE" }, _sum: { amount: true } }))._sum.amount ?? 0;
  log("new entry counts toward P&L", Math.round(beforeExp) === Math.round(expense + 999));
  await db.ledgerEntry.update({ where: { id: fresh.id }, data: { deletedAt: new Date() } });
  const afterExp = (await db.ledgerEntry.aggregate({ where: { schoolId: school.id, deletedAt: null, type: "EXPENSE" }, _sum: { amount: true } }))._sum.amount ?? 0;
  log("soft-deleted entry drops out of P&L", Math.round(afterExp) === Math.round(expense));
  await db.ledgerEntry.delete({ where: { id: fresh.id } });

  // RBAC: only SUPER_ADMIN & ACCOUNTANT touch accounting.
  log("ACCOUNTANT can manage accounting", getRolePermissions("ACCOUNTANT").includes("accounting:manage"));
  log("SUPER_ADMIN can view accounting", getRolePermissions("SUPER_ADMIN").includes("accounting:view"));
  log("SCHOOL_ADMIN cannot view accounting", !getRolePermissions("SCHOOL_ADMIN").includes("accounting:view"));
  log("PRINCIPAL cannot view accounting", !getRolePermissions("PRINCIPAL").includes("accounting:view"));

  console.log(ok ? "\n✅ ACCOUNTING DATA-LAYER CHECKS PASSED" : "\n❌ SOME CHECKS FAILED");
  if (!ok) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
