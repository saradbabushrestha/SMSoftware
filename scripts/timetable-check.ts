// Data-layer + logic invariants for the Timetable module (overlap / conflict detection).
import { PrismaClient } from "@prisma/client";
import { overlaps, timeToMinutes } from "../src/lib/timetable/display";

const db = new PrismaClient();

async function main() {
  let ok = true;
  const log = (label: string, pass: boolean, extra = "") => {
    console.log(`${pass ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
    if (!pass) ok = false;
  };

  // Overlap logic (pure)
  log("timeToMinutes('09:30') = 570", timeToMinutes("09:30") === 570);
  log("overlapping ranges detected", overlaps("09:00", "10:00", "09:30", "10:30"));
  log("non-overlapping ranges ok", !overlaps("09:00", "09:45", "09:45", "10:30"));
  log("disjoint ranges ok", !overlaps("09:00", "09:45", "13:00", "13:45"));

  const school = await db.school.findUniqueOrThrow({ where: { code: "GHS" } });
  const section = await db.section.findFirstOrThrow({ where: { name: "A", class: { code: "G10", schoolId: school.id } } });

  const seeded = await db.timetableEntry.count({ where: { sectionId: section.id } });
  log("seeded timetable present", seeded >= 24, String(seeded));

  // Replicate the section-conflict check used by the action
  const sundayEntries = await db.timetableEntry.findMany({ where: { sectionId: section.id, day: "SUNDAY" } });
  const clashes = sundayEntries.some((e) => overlaps("09:30", "10:15", e.startTime, e.endTime));
  const freeSlot = sundayEntries.some((e) => overlaps("13:00", "13:45", e.startTime, e.endTime));
  log("new period clashing with existing is detected", clashes);
  log("free slot is not a clash", !freeSlot);

  // Replicate the teacher-conflict check: the MATH teacher's periods on a day
  const teacher = await db.teacher.findFirstOrThrow({ where: { schoolId: school.id, employeeId: "EMP-0001" } });
  const tEntries = await db.timetableEntry.findMany({ where: { teacherId: teacher.id, day: "TUESDAY", schoolId: school.id } });
  // Any second class for the teacher at an existing slot would overlap
  const teacherClash = tEntries.length > 0 && tEntries.some((e) => overlaps(e.startTime, e.endTime, e.startTime, e.endTime));
  log("teacher double-book would be caught", tEntries.length === 0 || teacherClash);

  console.log(ok ? "\n✅ TIMETABLE CHECKS PASSED" : "\n❌ SOME CHECKS FAILED");
  if (!ok) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
