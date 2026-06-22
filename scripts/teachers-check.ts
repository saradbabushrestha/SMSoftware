// Data-layer invariants for the Teachers module (schema + subjects + soft-delete).
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
  const subject = await db.subject.findFirstOrThrow({ where: { schoolId } });

  const baseCount = await db.teacher.count({ where: { schoolId, deletedAt: null } });
  log("seeded teachers present", baseCount >= 6, String(baseCount));

  const last = await db.teacher.findFirst({
    where: { schoolId, employeeId: { startsWith: "EMP-" } },
    orderBy: { employeeId: "desc" },
    select: { employeeId: true },
  });
  const n = (last ? parseInt(last.employeeId.replace("EMP-", ""), 10) : 0) + 1;
  const emp = `EMP-${String(n).padStart(4, "0")}`;
  log("computed next employee id", /^EMP-\d{4}$/.test(emp), emp);

  const email = `teachersmoke.${emp.toLowerCase()}@greenwood.edu`;
  const created = await db.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: { email, passwordHash: "x", role: "TEACHER", firstName: "Smoke", lastName: "Teacher", schoolId },
    });
    return tx.teacher.create({
      data: { schoolId, userId: u.id, employeeId: emp, experienceYrs: 3, subjects: { connect: { id: subject.id } } },
      include: { subjects: true },
    });
  });
  log("create round-trip with subject assignment", created.subjects.some((s) => s.id === subject.id), emp);

  // Duplicate employee ID rejected (schoolId+employeeId unique)
  let dup = false;
  try {
    const u2 = await db.user.create({
      data: { email: `${email}.2`, passwordHash: "x", role: "TEACHER", firstName: "Dup", lastName: "Teacher", schoolId },
    });
    await db.teacher.create({ data: { schoolId, userId: u2.id, employeeId: emp } });
  } catch {
    dup = true;
  }
  log("duplicate employee id rejected", dup);
  await db.user.deleteMany({ where: { email: `${email}.2` } });

  // Subject re-assignment via set
  await db.teacher.update({ where: { id: created.id }, data: { subjects: { set: [] } } });
  const cleared = await db.teacher.findUniqueOrThrow({ where: { id: created.id }, include: { subjects: true } });
  log("subject set [] clears assignments", cleared.subjects.length === 0);

  // Soft delete
  await db.teacher.update({ where: { id: created.id }, data: { deletedAt: new Date() } });
  const activeAfter = await db.teacher.count({ where: { id: created.id, deletedAt: null } });
  const rowStillThere = await db.teacher.count({ where: { id: created.id } });
  log("soft-deleted excluded from active scope", activeAfter === 0);
  log("soft-deleted row preserved", rowStillThere === 1);

  // Cleanup
  await db.teacher.delete({ where: { id: created.id } });
  await db.user.delete({ where: { id: created.userId } });
  log("cleanup complete", true);

  console.log(ok ? "\n✅ TEACHERS DATA-LAYER CHECKS PASSED" : "\n❌ SOME CHECKS FAILED");
  if (!ok) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
