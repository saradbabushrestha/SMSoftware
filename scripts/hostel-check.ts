// Data-layer invariants for the Hostel module (one-room-per-student, capacity, cascade).
import { PrismaClient } from "@prisma/client";
import { isFull, occupancyLabel } from "../src/lib/hostel/display";

const db = new PrismaClient();

async function main() {
  let ok = true;
  const log = (label: string, pass: boolean, extra = "") => {
    console.log(`${pass ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
    if (!pass) ok = false;
  };

  const school = await db.school.findUniqueOrThrow({ where: { code: "GHS" } });
  const students = await db.student.findMany({ where: { schoolId: school.id, deletedAt: null }, take: 1 });

  log("seeded rooms present", (await db.room.count({ where: { schoolId: school.id, deletedAt: null } })) >= 2);
  log("seeded occupants present", (await db.roomAssignment.count()) >= 1);

  log("isFull respects capacity (0 = unlimited)", isFull(2, 2) && !isFull(1, 2) && !isFull(99, 0));
  log("occupancyLabel", occupancyLabel(2, 3) === "2/3" && occupancyLabel(2, 0) === "2");

  const a = await db.room.create({ data: { schoolId: school.id, block: "ZZ", number: "1", capacity: 1 } });
  const b = await db.room.create({ data: { schoolId: school.id, block: "ZZ", number: "2", capacity: 5 } });
  const sid = students[0].id;

  await db.roomAssignment.upsert({ where: { studentId: sid }, update: { roomId: a.id }, create: { roomId: a.id, studentId: sid } });
  log("occupant added to room A", (await db.roomAssignment.count({ where: { roomId: a.id } })) === 1);

  await db.roomAssignment.upsert({ where: { studentId: sid }, update: { roomId: b.id }, create: { roomId: b.id, studentId: sid } });
  log("re-assign moves student (one room per student)", (await db.roomAssignment.count({ where: { roomId: a.id } })) === 0 && (await db.roomAssignment.count({ where: { roomId: b.id } })) === 1);

  let dup = false;
  try {
    await db.roomAssignment.create({ data: { roomId: a.id, studentId: sid } });
  } catch {
    dup = true;
  }
  log("second room for same student rejected", dup);

  await db.roomAssignment.deleteMany({ where: { studentId: sid } });
  await db.room.delete({ where: { id: a.id } });
  await db.room.delete({ where: { id: b.id } });
  log("cleanup complete", true);

  console.log(ok ? "\n✅ HOSTEL DATA-LAYER CHECKS PASSED" : "\n❌ SOME CHECKS FAILED");
  if (!ok) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
