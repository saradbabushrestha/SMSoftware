// Data-layer invariants for the Events module (registration, capacity, uniqueness).
import { PrismaClient } from "@prisma/client";
import { isFull, isPast } from "../src/lib/events/display";

const db = new PrismaClient();

async function main() {
  let ok = true;
  const log = (label: string, pass: boolean, extra = "") => {
    console.log(`${pass ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
    if (!pass) ok = false;
  };

  const school = await db.school.findUniqueOrThrow({ where: { code: "GHS" } });
  const student = await db.user.findFirstOrThrow({ where: { email: "student@greenwood.edu" } });
  const teacher = await db.user.findFirstOrThrow({ where: { email: "teacher@greenwood.edu" } });

  log("seeded events present", (await db.event.count({ where: { schoolId: school.id, deletedAt: null } })) >= 4);
  log("seeded registration present", (await db.eventRegistration.count()) >= 1);

  // Display helpers (pure)
  log("isPast(past) true / isPast(future) false", isPast(new Date(Date.now() - 86400000)) && !isPast(new Date(Date.now() + 86400000)));
  log("isFull respects capacity (0 = unlimited)", isFull(5, 5) && !isFull(2, 5) && !isFull(99, 0));

  // Temp event lifecycle
  const event = await db.event.create({
    data: { schoolId: school.id, title: "ZZ Temp Event", type: "GENERAL", startsAt: new Date(Date.now() + 2 * 86400000), capacity: 1 },
  });

  await db.eventRegistration.create({ data: { eventId: event.id, userId: student.id } });
  const count1 = await db.eventRegistration.count({ where: { eventId: event.id } });
  log("registration recorded", count1 === 1);
  log("event would be full at capacity", isFull(count1, event.capacity));

  // Duplicate registration rejected (unique eventId+userId)
  let dup = false;
  try {
    await db.eventRegistration.create({ data: { eventId: event.id, userId: student.id } });
  } catch {
    dup = true;
  }
  log("duplicate registration rejected", dup);

  // A different user can still register at the DB level (capacity enforced in the action)
  await db.eventRegistration.create({ data: { eventId: event.id, userId: teacher.id } });
  log("second distinct registration allowed", (await db.eventRegistration.count({ where: { eventId: event.id } })) === 2);

  // Unregister
  await db.eventRegistration.delete({ where: { eventId_userId: { eventId: event.id, userId: student.id } } });
  log("unregister removes only that registration", (await db.eventRegistration.count({ where: { eventId: event.id } })) === 1);

  // Delete event cascades registrations
  await db.event.delete({ where: { id: event.id } });
  log("event delete cascades registrations", (await db.eventRegistration.count({ where: { eventId: event.id } })) === 0);

  console.log(ok ? "\n✅ EVENTS DATA-LAYER CHECKS PASSED" : "\n❌ SOME CHECKS FAILED");
  if (!ok) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
