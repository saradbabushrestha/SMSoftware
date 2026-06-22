// Data-layer invariants for the Guardians module (links, single-primary, soft-delete).
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  let ok = true;
  const log = (label: string, pass: boolean, extra = "") => {
    console.log(`${pass ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
    if (!pass) ok = false;
  };

  const school = await db.school.findUniqueOrThrow({ where: { code: "GHS" } });
  const schoolId = school.id;
  const student = await db.student.findFirstOrThrow({ where: { schoolId, admissionNumber: "ADM-0002" } });

  const seeded = await db.guardian.count({ where: { schoolId, deletedAt: null } });
  log("seeded guardians present", seeded >= 1, String(seeded));

  // Create two test guardians
  const mk = async (n: number) => {
    const u = await db.user.create({
      data: { email: `gtest${n}.${Date.now()}@greenwood.edu`, passwordHash: "x", role: "PARENT", firstName: `G${n}`, lastName: "Test", schoolId },
    });
    return db.guardian.create({ data: { schoolId, userId: u.id } });
  };
  const g1 = await mk(1);
  const g2 = await mk(2);
  log("create guardians", !!g1.id && !!g2.id);

  // Link g1 -> student (primary)
  await db.studentGuardian.create({ data: { studentId: student.id, guardianId: g1.id, relation: "FATHER", isPrimary: true } });
  // Link g2 -> student (primary) + enforce single-primary (mirrors linkStudentAction)
  await db.$transaction(async (tx) => {
    await tx.studentGuardian.upsert({
      where: { studentId_guardianId: { studentId: student.id, guardianId: g2.id } },
      update: { relation: "MOTHER", isPrimary: true },
      create: { studentId: student.id, guardianId: g2.id, relation: "MOTHER", isPrimary: true },
    });
    await tx.studentGuardian.updateMany({
      where: { studentId: student.id, guardianId: { not: g2.id }, isPrimary: true },
      data: { isPrimary: false },
    });
  });

  const l1 = await db.studentGuardian.findFirstOrThrow({ where: { studentId: student.id, guardianId: g1.id } });
  const l2 = await db.studentGuardian.findFirstOrThrow({ where: { studentId: student.id, guardianId: g2.id } });
  log("two guardians linked to one student", true);
  log("single-primary enforced (g2 primary, g1 demoted)", l2.isPrimary && !l1.isPrimary);

  // Duplicate link rejected (studentId+guardianId unique)
  let dup = false;
  try {
    await db.studentGuardian.create({ data: { studentId: student.id, guardianId: g1.id } });
  } catch {
    dup = true;
  }
  log("duplicate student-guardian link rejected", dup);

  // Unlink g1
  await db.studentGuardian.delete({ where: { id: l1.id } });
  const remaining = await db.studentGuardian.count({ where: { studentId: student.id, guardianId: { in: [g1.id, g2.id] } } });
  log("unlink removes the relationship only", remaining === 1);

  // Soft-delete g2 guardian
  await db.guardian.update({ where: { id: g2.id }, data: { deletedAt: new Date() } });
  const activeG2 = await db.guardian.count({ where: { id: g2.id, deletedAt: null } });
  log("soft-deleted guardian excluded", activeG2 === 0);

  // Cleanup
  await db.studentGuardian.deleteMany({ where: { guardianId: { in: [g1.id, g2.id] } } });
  await db.guardian.deleteMany({ where: { id: { in: [g1.id, g2.id] } } });
  await db.user.deleteMany({ where: { id: { in: [g1.userId, g2.userId] } } });
  log("cleanup complete", true);

  console.log(ok ? "\n✅ GUARDIANS DATA-LAYER CHECKS PASSED" : "\n❌ SOME CHECKS FAILED");
  if (!ok) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
