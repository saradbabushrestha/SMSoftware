// Data-layer invariants for the Schools (multi-tenancy) module.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  let ok = true;
  const log = (label: string, pass: boolean, extra = "") => {
    console.log(`${pass ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
    if (!pass) ok = false;
  };

  const ghs = await db.school.findUniqueOrThrow({ where: { code: "GHS" } });
  log("seeded school present + active", ghs.isActive && ghs.deletedAt === null);

  // Per-school stats reflect real data
  const [students, teachers] = await Promise.all([
    db.student.count({ where: { schoolId: ghs.id, deletedAt: null } }),
    db.teacher.count({ where: { schoolId: ghs.id, deletedAt: null } }),
  ]);
  log("per-school stats non-zero", students > 0 && teachers > 0, `${students} students, ${teachers} teachers`);

  // Lifecycle on a temp school
  const code = `ZZTEST-${Date.now().toString(36)}`;
  const created = await db.school.create({ data: { name: "ZZ Test School", code } });
  log("create school", !!created.id, code);

  let dup = false;
  try {
    await db.school.create({ data: { name: "Dup", code } });
  } catch {
    dup = true;
  }
  log("duplicate school code rejected", dup);

  // Deactivate
  await db.school.update({ where: { id: created.id }, data: { isActive: false } });
  log("deactivate sets isActive false", !(await db.school.findUniqueOrThrow({ where: { id: created.id } })).isActive);

  // Archive (soft-delete) hides it from active scope
  await db.school.update({ where: { id: created.id }, data: { deletedAt: new Date(), isActive: false } });
  const activeCount = await db.school.count({ where: { id: created.id, deletedAt: null } });
  log("archived school excluded from active scope", activeCount === 0);

  await db.school.delete({ where: { id: created.id } });
  log("cleanup complete", true);

  console.log(ok ? "\n✅ SCHOOLS DATA-LAYER CHECKS PASSED" : "\n❌ SOME CHECKS FAILED");
  if (!ok) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
