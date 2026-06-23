// Data-layer invariants for the Assignments module (submit/grade workflow).
import { PrismaClient } from "@prisma/client";
import { gradePercent, isOverdue } from "../src/lib/assignments/display";

const db = new PrismaClient();

async function main() {
  let ok = true;
  const log = (label: string, pass: boolean, extra = "") => {
    console.log(`${pass ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
    if (!pass) ok = false;
  };

  const school = await db.school.findUniqueOrThrow({ where: { code: "GHS" } });
  const section = await db.section.findFirstOrThrow({ where: { name: "A", class: { code: "G10", schoolId: school.id } } });
  const subject = await db.subject.findFirstOrThrow({ where: { schoolId: school.id, code: "MATH" } });
  const enrollment = await db.enrollment.findFirstOrThrow({ where: { sectionId: section.id, deletedAt: null } });
  const studentId = enrollment.studentId;
  const teacher = await db.user.findFirstOrThrow({ where: { email: "teacher@greenwood.edu" } });

  log("seeded assignments present", (await db.assignment.count({ where: { schoolId: school.id, deletedAt: null } })) >= 2);
  log("seeded submission present", (await db.submission.count()) >= 1);

  // Display helpers
  log("gradePercent(18,20) = 90", gradePercent(18, 20) === 90);
  log("isOverdue(past) true / (future) false", isOverdue(new Date(Date.now() - 86400000)) && !isOverdue(new Date(Date.now() + 86400000)));

  // Lifecycle on a temp assignment
  const a = await db.assignment.create({
    data: { schoolId: school.id, sectionId: section.id, subjectId: subject.id, title: "ZZ Temp Assignment", dueDate: new Date(Date.now() + 86400000), maxPoints: 10, createdById: teacher.id },
  });

  // Submit (upsert)
  await db.submission.upsert({
    where: { assignmentId_studentId: { assignmentId: a.id, studentId } },
    update: { content: "v1", status: "SUBMITTED" },
    create: { assignmentId: a.id, studentId, content: "v1", status: "SUBMITTED" },
  });
  log("submission created", (await db.submission.count({ where: { assignmentId: a.id } })) === 1);

  // Re-submit updates same row (one per student/assignment)
  await db.submission.upsert({
    where: { assignmentId_studentId: { assignmentId: a.id, studentId } },
    update: { content: "v2", status: "SUBMITTED" },
    create: { assignmentId: a.id, studentId, content: "v2", status: "SUBMITTED" },
  });
  const sub = await db.submission.findFirstOrThrow({ where: { assignmentId: a.id, studentId } });
  log("re-submit updates same row", (await db.submission.count({ where: { assignmentId: a.id } })) === 1 && sub.content === "v2");

  // Duplicate create rejected (unique assignmentId+studentId)
  let dup = false;
  try {
    await db.submission.create({ data: { assignmentId: a.id, studentId, content: "dup" } });
  } catch {
    dup = true;
  }
  log("duplicate submission rejected", dup);

  // Grade (clamp to maxPoints conceptually — store 10)
  await db.submission.update({ where: { id: sub.id }, data: { grade: 10, status: "GRADED", gradedAt: new Date(), gradedById: teacher.id } });
  const graded = await db.submission.findUniqueOrThrow({ where: { id: sub.id } });
  log("grading sets GRADED + grade", graded.status === "GRADED" && graded.grade === 10);

  // Delete assignment cascades submissions
  await db.assignment.delete({ where: { id: a.id } });
  log("assignment delete cascades submissions", (await db.submission.count({ where: { assignmentId: a.id } })) === 0);

  console.log(ok ? "\n✅ ASSIGNMENTS DATA-LAYER CHECKS PASSED" : "\n❌ SOME CHECKS FAILED");
  if (!ok) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
