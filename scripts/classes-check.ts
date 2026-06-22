// Data-layer invariants for the Classes & Sections module.
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
  const teacher = await db.teacher.findFirstOrThrow({ where: { schoolId } });

  const classes = await db.schoolClass.count({ where: { schoolId, deletedAt: null } });
  const sections = await db.section.count({ where: { deletedAt: null, class: { schoolId } } });
  log("seeded classes present", classes >= 5, String(classes));
  log("seeded sections present", sections >= 10, String(sections));

  // Create a class
  const code = `ZTEST-${classes}`;
  const created = await db.schoolClass.create({
    data: { schoolId, name: "Z Test Class", code, capacity: 50 },
  });
  log("create class", !!created.id, code);

  // Duplicate class code rejected (schoolId+code unique)
  let dupClass = false;
  try {
    await db.schoolClass.create({ data: { schoolId, name: "Dup", code } });
  } catch {
    dupClass = true;
  }
  log("duplicate class code rejected", dupClass);

  // Create section with class teacher
  const section = await db.section.create({
    data: { classId: created.id, name: "A", capacity: 30, classTeacherId: teacher.id },
  });
  log("create section with class teacher", section.classTeacherId === teacher.id);

  // Duplicate section name within class rejected (classId+name unique)
  let dupSection = false;
  try {
    await db.section.create({ data: { classId: created.id, name: "A" } });
  } catch {
    dupSection = true;
  }
  log("duplicate section name rejected", dupSection);

  // Soft-delete section
  await db.section.update({ where: { id: section.id }, data: { deletedAt: new Date() } });
  const secActive = await db.section.count({ where: { id: section.id, deletedAt: null } });
  log("soft-deleted section excluded", secActive === 0);

  // Soft-delete class + cascade soft-delete its (live) sections — mirrors deleteClassAction
  const liveSection = await db.section.create({ data: { classId: created.id, name: "B" } });
  const now = new Date();
  await db.$transaction([
    db.section.updateMany({ where: { classId: created.id, deletedAt: null }, data: { deletedAt: now } }),
    db.schoolClass.update({ where: { id: created.id }, data: { deletedAt: now } }),
  ]);
  const classActive = await db.schoolClass.count({ where: { id: created.id, deletedAt: null } });
  const liveSecActive = await db.section.count({ where: { id: liveSection.id, deletedAt: null } });
  log("soft-deleted class excluded", classActive === 0);
  log("class delete cascades to sections", liveSecActive === 0);

  // Cleanup (hard delete test rows)
  await db.section.deleteMany({ where: { classId: created.id } });
  await db.schoolClass.delete({ where: { id: created.id } });
  log("cleanup complete", true);

  console.log(ok ? "\n✅ CLASSES DATA-LAYER CHECKS PASSED" : "\n❌ SOME CHECKS FAILED");
  if (!ok) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
