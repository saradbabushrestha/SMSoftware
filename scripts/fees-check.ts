// Data-layer invariants for the Fees & Payments module.
import { PrismaClient, type InvoiceStatus } from "@prisma/client";

const db = new PrismaClient();

async function recompute(invoiceId: string) {
  const inv = await db.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  const paid = (await db.payment.aggregate({ where: { invoiceId }, _sum: { amount: true } }))._sum.amount ?? 0;
  const status: InvoiceStatus = paid >= inv.amount ? "PAID" : paid > 0 ? "PARTIAL" : "PENDING";
  await db.invoice.update({ where: { id: invoiceId }, data: { status } });
  return { paid, status, balance: Math.max(0, inv.amount - paid) };
}

async function main() {
  let ok = true;
  const log = (label: string, pass: boolean, extra = "") => {
    console.log(`${pass ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
    if (!pass) ok = false;
  };

  const school = await db.school.findUniqueOrThrow({ where: { code: "GHS" } });
  const student = await db.student.findFirstOrThrow({ where: { schoolId: school.id, admissionNumber: "ADM-0002" } });

  const seededInvoices = await db.invoice.count({ where: { schoolId: school.id, deletedAt: null } });
  const seededPayments = await db.payment.count({ where: { schoolId: school.id } });
  log("seeded invoices present", seededInvoices >= 6, String(seededInvoices));
  log("seeded payments present", seededPayments >= 2, String(seededPayments));

  // Seeded demo student statuses
  const demo = await db.student.findFirstOrThrow({ where: { admissionNumber: "ADM-0001" } });
  const tuition = await db.invoice.findFirst({ where: { studentId: demo.id, title: "Tuition fee — Term 1" } });
  const transport = await db.invoice.findFirst({ where: { studentId: demo.id, title: "Transport — Term 1" } });
  log("demo tuition is PAID", tuition?.status === "PAID");
  log("demo transport is PARTIAL", transport?.status === "PARTIAL");

  // Lifecycle on a fresh invoice
  const inv = await db.invoice.create({ data: { schoolId: school.id, studentId: student.id, category: "TUITION", title: "ZZ Test Fee", amount: 1000 } });
  log("new invoice starts PENDING", inv.status === "PENDING");

  await db.payment.create({ data: { schoolId: school.id, invoiceId: inv.id, amount: 400, method: "ESEWA", reference: "ESEWA-T1" } });
  let s = await recompute(inv.id);
  log("partial payment → PARTIAL, balance 600", s.status === "PARTIAL" && s.balance === 600);

  await db.payment.create({ data: { schoolId: school.id, invoiceId: inv.id, amount: 600, method: "KHALTI", reference: "KHALTI-T1" } });
  s = await recompute(inv.id);
  log("full payment → PAID, balance 0", s.status === "PAID" && s.balance === 0);

  const collected = (await db.payment.aggregate({ where: { invoiceId: inv.id }, _sum: { amount: true } }))._sum.amount ?? 0;
  log("collected equals 1000", collected === 1000);

  // Deleting invoice cascades to its payments
  await db.invoice.delete({ where: { id: inv.id } });
  const orphanPayments = await db.payment.count({ where: { invoiceId: inv.id } });
  log("invoice delete cascades to payments", orphanPayments === 0);

  console.log(ok ? "\n✅ FEES DATA-LAYER CHECKS PASSED" : "\n❌ SOME CHECKS FAILED");
  if (!ok) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
