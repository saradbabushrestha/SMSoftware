// Data-layer invariants for the Students module (schema + soft-delete + relations).
// Query *functions* and RBAC are exercised via HTTP against the running app.
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
  const section = await db.section.findFirstOrThrow({ where: { class: { schoolId } } });
  const ay = await db.academicYear.findFirst({ where: { schoolId, status: "ACTIVE" } });

  const baseCount = await db.student.count({ where: { schoolId, deletedAt: null } });
  log("seeded students present", baseCount >= 16, String(baseCount));

  // Next admission number (mirrors queries.nextAdmissionNumber)
  const last = await db.student.findFirst({
    where: { schoolId, admissionNumber: { startsWith: "ADM-" } },
    orderBy: { admissionNumber: "desc" },
    select: { admissionNumber: true },
  });
  const n = (last ? parseInt(last.admissionNumber.replace("ADM-", ""), 10) : 0) + 1;
  const adm = `ADM-${String(n).padStart(4, "0")}`;
  log("computed next admission no.", /^ADM-\d{4}$/.test(adm), adm);

  // Create (user + student + enrollment), as the create action does
  const email = `smoketest.${adm.toLowerCase()}@greenwood.edu`;
  const created = await db.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: { email, passwordHash: "x", role: "STUDENT", firstName: "Smoke", lastName: "Test", schoolId },
    });
    const s = await tx.student.create({
      data: { schoolId, userId: u.id, admissionNumber: adm, gender: "MALE", status: "ACTIVE", admittedOn: new Date() },
    });
    if (ay) await tx.enrollment.create({ data: { schoolId, studentId: s.id, sectionId: section.id, academicYearId: ay.id } });
    return s;
  });
  log("create round-trip (user+student+enrollment)", true, adm);

  // Unique admission number enforced per school
  let dup = false;
  try {
    const u2 = await db.user.create({
      data: { email: `${email}.2`, passwordHash: "x", role: "STUDENT", firstName: "Dup", lastName: "Test", schoolId },
    });
    await db.student.create({ data: { schoolId, userId: u2.id, admissionNumber: adm, status: "ACTIVE" } });
    await db.user.delete({ where: { id: u2.id } }); // shouldn't reach
  } catch {
    dup = true;
  }
  log("duplicate admission number rejected", dup);
  // clean any orphan dup user
  await db.user.deleteMany({ where: { email: `${email}.2` } });

  // Soft-delete excludes from active queries but preserves the row
  await db.student.update({ where: { id: created.id }, data: { deletedAt: new Date(), status: "WITHDRAWN" } });
  const activeAfter = await db.student.count({ where: { id: created.id, deletedAt: null } });
  const rowStillThere = await db.student.count({ where: { id: created.id } });
  log("soft-deleted excluded from active scope", activeAfter === 0);
  log("soft-deleted row preserved", rowStillThere === 1);

  // Cleanup
  await db.enrollment.deleteMany({ where: { studentId: created.id } });
  await db.student.delete({ where: { id: created.id } });
  await db.user.delete({ where: { id: created.userId } });
  log("cleanup complete", true);

  console.log(ok ? "\n✅ STUDENTS DATA-LAYER CHECKS PASSED" : "\n❌ SOME CHECKS FAILED");
  if (!ok) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
