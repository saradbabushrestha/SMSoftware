// Data-layer invariants for the report-approval workflow.
import { PrismaClient, type UserRole } from "@prisma/client";
import { getRolePermissions } from "../src/lib/rbac/permissions";

const db = new PrismaClient();

async function main() {
  let ok = true;
  const log = (label: string, pass: boolean, extra = "") => {
    console.log(`${pass ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
    if (!pass) ok = false;
  };

  const school = await db.school.findUniqueOrThrow({ where: { code: "GHS" } });

  const subs = await db.reportSubmission.findMany({ where: { schoolId: school.id, deletedAt: null } });
  log("seeded submissions present", subs.length >= 2, String(subs.length));
  log("has a pending (SUBMITTED) one", subs.some((s) => s.status === "SUBMITTED"));
  log("has an approved one with reviewer + note", subs.some((s) => s.status === "APPROVED" && !!s.reviewedById && !!s.reviewNote));

  // Approve transition: a SUBMITTED report → APPROVED stamps reviewer + time.
  const tmp = await db.reportSubmission.create({
    data: { schoolId: school.id, title: "ZZ probe", category: "Other", summary: "x", status: "SUBMITTED" },
  });
  const claim = await db.reportSubmission.updateMany({
    where: { id: tmp.id, status: "SUBMITTED" },
    data: { status: "APPROVED", reviewedById: "reviewer", reviewedAt: new Date() },
  });
  const after = await db.reportSubmission.findUnique({ where: { id: tmp.id } });
  log("approve transitions SUBMITTED→APPROVED with reviewer", claim.count === 1 && after?.status === "APPROVED" && after?.reviewedById === "reviewer");
  // Re-approving an already-reviewed report is a no-op (guard on status=SUBMITTED).
  const reclaim = await db.reportSubmission.updateMany({ where: { id: tmp.id, status: "SUBMITTED" }, data: { status: "REJECTED" } });
  log("already-reviewed report can't be re-reviewed", reclaim.count === 0);
  await db.reportSubmission.delete({ where: { id: tmp.id } });

  // Soft delete hides it.
  const tmp2 = await db.reportSubmission.create({ data: { schoolId: school.id, title: "ZZ del", category: "Other", summary: "x" } });
  await db.reportSubmission.update({ where: { id: tmp2.id }, data: { deletedAt: new Date() } });
  const visible = await db.reportSubmission.count({ where: { id: tmp2.id, deletedAt: null } });
  log("soft delete removes it from the list", visible === 0);
  await db.reportSubmission.delete({ where: { id: tmp2.id } });

  // RBAC: only super/principal approve; report:view is broader.
  const roles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "TEACHER", "STUDENT", "PARENT", "ACCOUNTANT", "LIBRARIAN"];
  const approvers = roles.filter((r) => getRolePermissions(r).includes("report:approve"));
  log("only super + principal approve reports", approvers.sort().join(",") === "PRINCIPAL,SUPER_ADMIN", approvers.join(","));
  log("teachers can view (submit) but not approve", getRolePermissions("TEACHER").includes("report:view") && !getRolePermissions("TEACHER").includes("report:approve"));

  console.log(ok ? "\n✅ REPORT-SUBMISSIONS DATA-LAYER CHECKS PASSED" : "\n❌ SOME CHECKS FAILED");
  if (!ok) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
