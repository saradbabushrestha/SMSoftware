// Data-layer invariants for the Subjects module.
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
  const klass = await db.schoolClass.findFirstOrThrow({ where: { schoolId } });
  const teacher = await db.teacher.findFirstOrThrow({ where: { schoolId } });

  const seeded = await db.subject.count({ where: { schoolId, deletedAt: null } });
  log("seeded subjects present", seeded >= 5, String(seeded));

  const code = `ZSUB-${seeded}`;
  // Create class-linked subject with a teacher
  const created = await db.subject.create({
    data: {
      schoolId,
      classId: klass.id,
      name: "Z Test Subject",
      code,
      credits: 3,
      teachers: { connect: { id: teacher.id } },
    },
    include: { teachers: true, class: true },
  });
  log("create subject (class-linked, teacher assigned)", created.classId === klass.id && created.teachers.some((t) => t.id === teacher.id), code);

  // Inverse relation reflects the assignment
  const t = await db.teacher.findUniqueOrThrow({ where: { id: teacher.id }, include: { subjects: true } });
  log("teacher.subjects includes the subject (m:n inverse)", t.subjects.some((s) => s.id === created.id));

  // Duplicate code rejected (schoolId+code unique)
  let dup = false;
  try {
    await db.subject.create({ data: { schoolId, name: "Dup", code } });
  } catch {
    dup = true;
  }
  log("duplicate subject code rejected", dup);

  // School-wide subject (no class)
  const wide = await db.subject.create({ data: { schoolId, name: "Z Wide", code: `${code}-W`, credits: 1 } });
  log("school-wide subject (classId null)", wide.classId === null);

  // teachers set [] clears assignment
  await db.subject.update({ where: { id: created.id }, data: { teachers: { set: [] } } });
  const cleared = await db.subject.findUniqueOrThrow({ where: { id: created.id }, include: { teachers: true } });
  log("teachers set [] clears assignment", cleared.teachers.length === 0);

  // Soft delete
  await db.subject.update({ where: { id: created.id }, data: { deletedAt: new Date() } });
  const active = await db.subject.count({ where: { id: created.id, deletedAt: null } });
  log("soft-deleted subject excluded", active === 0);

  // Cleanup
  await db.subject.deleteMany({ where: { id: { in: [created.id, wide.id] } } });
  log("cleanup complete", true);

  console.log(ok ? "\n✅ SUBJECTS DATA-LAYER CHECKS PASSED" : "\n❌ SOME CHECKS FAILED");
  if (!ok) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
