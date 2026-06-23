// Data-layer invariants for Teacher Evaluations — overall math, scoping, who can evaluate.
import { PrismaClient, type UserRole } from "@prisma/client";
import { getRolePermissions } from "../src/lib/rbac/permissions";
import { overallScore } from "../src/lib/evaluations/display";

const db = new PrismaClient();

async function main() {
  let ok = true;
  const log = (label: string, pass: boolean, extra = "") => {
    console.log(`${pass ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
    if (!pass) ok = false;
  };

  const school = await db.school.findUniqueOrThrow({ where: { code: "GHS" } });

  // Seeded evaluation present + belongs to the demo teacher.
  const evals = await db.teacherEvaluation.findMany({ where: { schoolId: school.id, deletedAt: null }, include: { teacher: { include: { user: true } } } });
  log("seeded evaluation present", evals.length >= 1, String(evals.length));

  const ev = evals[0];
  // Overall is the mean of the four dimensions.
  const expected = Math.round(((ev.teaching + ev.classroom + ev.collaboration + ev.punctuality) / 4) * 10) / 10;
  log("overall = mean of four dimensions", overallScore(ev) === expected, `${overallScore(ev)} == ${expected}`);
  log("all dimension scores within 1–5", [ev.teaching, ev.classroom, ev.collaboration, ev.punctuality].every((n) => n >= 1 && n <= 5));

  // Scoping: an evaluation only resolves within its own school.
  const otherSchool = await db.school.findFirst({ where: { code: { not: "GHS" } } });
  if (otherSchool) {
    const crossTenant = await db.teacherEvaluation.findFirst({ where: { id: ev.id, schoolId: otherSchool.id } });
    log("evaluation not visible from another tenant", crossTenant === null);
  } else {
    log("evaluation not visible from another tenant (skipped — single tenant)", true);
  }

  // Soft delete hides it; restore after.
  await db.teacherEvaluation.update({ where: { id: ev.id }, data: { deletedAt: new Date() } });
  const afterDelete = await db.teacherEvaluation.count({ where: { id: ev.id, deletedAt: null } });
  log("soft delete removes it from the list", afterDelete === 0);
  await db.teacherEvaluation.update({ where: { id: ev.id }, data: { deletedAt: null } });

  // RBAC: only admins, principals and super admin may evaluate.
  const roles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "TEACHER", "STUDENT", "PARENT", "ACCOUNTANT", "LIBRARIAN"];
  const evaluators = roles.filter((r) => getRolePermissions(r).includes("teacher:evaluate"));
  log("only super/school-admin/principal can evaluate", evaluators.sort().join(",") === "PRINCIPAL,SCHOOL_ADMIN,SUPER_ADMIN", evaluators.join(","));
  log("teachers cannot evaluate", !getRolePermissions("TEACHER").includes("teacher:evaluate"));

  console.log(ok ? "\n✅ EVALUATIONS DATA-LAYER CHECKS PASSED" : "\n❌ SOME CHECKS FAILED");
  if (!ok) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
