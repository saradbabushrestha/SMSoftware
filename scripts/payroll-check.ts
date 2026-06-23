// Data-layer invariants for the Payroll module.
import { PrismaClient } from "@prisma/client";
import { getRolePermissions } from "../src/lib/rbac/permissions";

const db = new PrismaClient();

function computeNetPay(basic: number, allowances: number, deductions: number, tax: number) {
  return Math.max(0, basic + allowances - deductions - tax);
}

async function main() {
  let ok = true;
  const log = (label: string, pass: boolean, extra = "") => {
    console.log(`${pass ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
    if (!pass) ok = false;
  };

  const school = await db.school.findUniqueOrThrow({ where: { code: "GHS" } });

  // Seeded payslips present.
  const records = await db.payrollRecord.findMany({ where: { schoolId: school.id } });
  log("seeded payslips present", records.length >= 12, String(records.length));

  // netPay is always basic + allowances − deductions − tax.
  const badNet = records.filter((r) => Math.round(r.netPay) !== Math.round(computeNetPay(r.basicSalary, r.allowances, r.deductions, r.tax)));
  log("netPay computed correctly for every record", badNet.length === 0, `${badNet.length} mismatches`);

  // (teacher, month) is unique.
  const keys = records.map((r) => `${r.teacherId}:${r.month}`);
  log("(teacher, month) unique", new Set(keys).size === keys.length);

  // Stats: total payout & paid-out aggregate correctly.
  const totalPayout = records.reduce((a, r) => a + r.netPay, 0);
  const paidOut = records.filter((r) => r.status === "PAID").reduce((a, r) => a + r.netPay, 0);
  const aggTotal = (await db.payrollRecord.aggregate({ where: { schoolId: school.id }, _sum: { netPay: true } }))._sum.netPay ?? 0;
  const aggPaid = (await db.payrollRecord.aggregate({ where: { schoolId: school.id, status: "PAID" }, _sum: { netPay: true } }))._sum.netPay ?? 0;
  log("totalPayout aggregate matches", Math.round(aggTotal) === Math.round(totalPayout), totalPayout.toLocaleString());
  log("paidOut aggregate matches", Math.round(aggPaid) === Math.round(paidOut), paidOut.toLocaleString());
  log("paid payslips carry paidAt", records.filter((r) => r.status === "PAID").every((r) => !!r.paidAt));

  // Unique constraint actually enforced.
  const sample = records[0];
  let dupBlocked = false;
  try {
    await db.payrollRecord.create({ data: { schoolId: school.id, teacherId: sample.teacherId, month: sample.month, basicSalary: 1, netPay: 1 } });
  } catch {
    dupBlocked = true;
  }
  log("duplicate (teacher, month) rejected by DB", dupBlocked);

  // RBAC: only SUPER_ADMIN & ACCOUNTANT manage payroll; teachers/students cannot view.
  log("ACCOUNTANT can manage payroll", getRolePermissions("ACCOUNTANT").includes("payroll:manage"));
  log("SUPER_ADMIN can view payroll", getRolePermissions("SUPER_ADMIN").includes("payroll:view"));
  log("TEACHER cannot view payroll", !getRolePermissions("TEACHER").includes("payroll:view"));
  log("SCHOOL_ADMIN cannot manage payroll", !getRolePermissions("SCHOOL_ADMIN").includes("payroll:manage"));

  console.log(ok ? "\n✅ PAYROLL DATA-LAYER CHECKS PASSED" : "\n❌ SOME CHECKS FAILED");
  if (!ok) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
