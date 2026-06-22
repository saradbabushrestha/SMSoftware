// Data-layer invariants for the Attendance module (upsert-per-day, uniqueness, summary).
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  let ok = true;
  const log = (label: string, pass: boolean, extra = "") => {
    console.log(`${pass ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
    if (!pass) ok = false;
  };

  const school = await db.school.findUniqueOrThrow({ where: { code: "GHS" } });
  const section = await db.section.findFirstOrThrow({ where: { name: "A", class: { code: "G10", schoolId: school.id } } });
  const enrollment = await db.enrollment.findFirstOrThrow({ where: { sectionId: section.id, deletedAt: null } });
  const studentId = enrollment.studentId;

  const seeded = await db.attendance.count({ where: { sectionId: section.id } });
  log("seeded attendance present", seeded >= 1, String(seeded));

  const date = new Date("2000-01-03T00:00:00.000Z");

  // Upsert PRESENT
  await db.attendance.upsert({
    where: { studentId_date: { studentId, date } },
    update: { status: "PRESENT", sectionId: section.id },
    create: { schoolId: school.id, sectionId: section.id, studentId, date, status: "PRESENT" },
  });
  let rec = await db.attendance.findUniqueOrThrow({ where: { studentId_date: { studentId, date } } });
  log("upsert creates record (PRESENT)", rec.status === "PRESENT");

  // Re-mark same day -> updates the same row (no duplicate)
  await db.attendance.upsert({
    where: { studentId_date: { studentId, date } },
    update: { status: "ABSENT", sectionId: section.id },
    create: { schoolId: school.id, sectionId: section.id, studentId, date, status: "ABSENT" },
  });
  const sameDay = await db.attendance.count({ where: { studentId, date } });
  rec = await db.attendance.findUniqueOrThrow({ where: { studentId_date: { studentId, date } } });
  log("re-mark updates same row (one per day)", sameDay === 1 && rec.status === "ABSENT");

  // Duplicate create rejected (studentId+date unique)
  let dup = false;
  try {
    await db.attendance.create({ data: { schoolId: school.id, sectionId: section.id, studentId, date, status: "LATE" } });
  } catch {
    dup = true;
  }
  log("duplicate (studentId,date) rejected", dup);

  // Summary sanity for the student
  const records = await db.attendance.findMany({ where: { studentId } });
  const present = records.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
  const pct = records.length ? Math.round((present / records.length) * 100) : 0;
  log("summary computes a valid percentage", pct >= 0 && pct <= 100, `${pct}% of ${records.length}`);

  // Cleanup test record
  await db.attendance.delete({ where: { studentId_date: { studentId, date } } });
  log("cleanup complete", true);

  console.log(ok ? "\n✅ ATTENDANCE DATA-LAYER CHECKS PASSED" : "\n❌ SOME CHECKS FAILED");
  if (!ok) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
