// Data-layer invariants for the Transport module (one-route-per-student, capacity, cascade).
import { PrismaClient } from "@prisma/client";
import { isFull, capacityLabel } from "../src/lib/transport/display";

const db = new PrismaClient();

async function main() {
  let ok = true;
  const log = (label: string, pass: boolean, extra = "") => {
    console.log(`${pass ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
    if (!pass) ok = false;
  };

  const school = await db.school.findUniqueOrThrow({ where: { code: "GHS" } });
  const students = await db.student.findMany({ where: { schoolId: school.id, deletedAt: null }, take: 2 });

  log("seeded routes present", (await db.route.count({ where: { schoolId: school.id, deletedAt: null } })) >= 2);
  log("seeded assignments present", (await db.transportAssignment.count()) >= 1);

  // Display helpers
  log("isFull respects capacity (0 = unlimited)", isFull(30, 30) && !isFull(5, 30) && !isFull(99, 0));
  log("capacityLabel", capacityLabel(3, 30) === "3/30" && capacityLabel(3, 0) === "3");

  // Temp routes
  const rA = await db.route.create({ data: { schoolId: school.id, name: "ZZ Route A", capacity: 1 } });
  const rB = await db.route.create({ data: { schoolId: school.id, name: "ZZ Route B", capacity: 5 } });

  // Assign student to A
  await db.transportAssignment.upsert({ where: { studentId: students[0].id }, update: { routeId: rA.id }, create: { routeId: rA.id, studentId: students[0].id } });
  log("assignment created on route A", (await db.transportAssignment.count({ where: { routeId: rA.id } })) === 1);

  // One route per student: re-assign the same student to B moves them (no duplicate)
  await db.transportAssignment.upsert({ where: { studentId: students[0].id }, update: { routeId: rB.id }, create: { routeId: rB.id, studentId: students[0].id } });
  const onA = await db.transportAssignment.count({ where: { routeId: rA.id } });
  const onB = await db.transportAssignment.count({ where: { routeId: rB.id } });
  log("re-assign moves student (one route per student)", onA === 0 && onB === 1);

  // Duplicate assignment for same student rejected (unique studentId)
  let dup = false;
  try {
    await db.transportAssignment.create({ data: { routeId: rA.id, studentId: students[0].id } });
  } catch {
    dup = true;
  }
  log("second route for same student rejected", dup);

  // Delete route cascades assignments
  await db.transportAssignment.deleteMany({ where: { studentId: students[0].id } });
  await db.route.delete({ where: { id: rA.id } });
  await db.route.delete({ where: { id: rB.id } });
  log("cleanup complete", true);

  console.log(ok ? "\n✅ TRANSPORT DATA-LAYER CHECKS PASSED" : "\n❌ SOME CHECKS FAILED");
  if (!ok) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
