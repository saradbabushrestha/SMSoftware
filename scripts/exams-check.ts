// Data-layer + grading invariants for the Exams & Grades module.
import { PrismaClient } from "@prisma/client";
import { gradeFromPercent, gradeFromMarks } from "../src/lib/exams/grading";

const db = new PrismaClient();

async function main() {
  let ok = true;
  const log = (label: string, pass: boolean, extra = "") => {
    console.log(`${pass ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
    if (!pass) ok = false;
  };

  // Grading scale boundaries (pure logic)
  log("90% → A+ (4.0)", gradeFromPercent(90).letter === "A+" && gradeFromPercent(90).gpa === 4.0);
  log("85% → A", gradeFromPercent(85).letter === "A");
  log("33% → D, pass", gradeFromPercent(33).letter === "D" && gradeFromPercent(33).pass);
  log("32% → fail", !gradeFromPercent(32).pass);
  log("marks 45/50 → 90% A+", gradeFromMarks(45, 50).percent === 90 && gradeFromMarks(45, 50).letter === "A+");

  const school = await db.school.findUniqueOrThrow({ where: { code: "GHS" } });
  const g10 = await db.schoolClass.findFirstOrThrow({ where: { code: "G10", schoolId: school.id } });

  const seededExam = await db.exam.findFirst({ where: { schoolId: school.id, classId: g10.id, published: true } });
  const seededResults = seededExam ? await db.examResult.count({ where: { examId: seededExam.id } }) : 0;
  log("seeded published exam present", !!seededExam);
  log("seeded results present", seededResults >= 9, String(seededResults));

  // Temp exam: upsert + uniqueness
  const subject = await db.subject.findFirstOrThrow({ where: { schoolId: school.id } });
  const enrollment = await db.enrollment.findFirstOrThrow({ where: { section: { classId: g10.id }, deletedAt: null } });
  const tempExam = await db.exam.create({
    data: { schoolId: school.id, classId: g10.id, name: "ZZ Temp Exam", type: "UNIT_TEST", maxMarks: 100 },
  });

  await db.examResult.upsert({
    where: { examId_studentId_subjectId: { examId: tempExam.id, studentId: enrollment.studentId, subjectId: subject.id } },
    update: { marksObtained: 80, maxMarks: 100 },
    create: { examId: tempExam.id, studentId: enrollment.studentId, subjectId: subject.id, marksObtained: 80, maxMarks: 100 },
  });
  // Re-mark same cell
  await db.examResult.upsert({
    where: { examId_studentId_subjectId: { examId: tempExam.id, studentId: enrollment.studentId, subjectId: subject.id } },
    update: { marksObtained: 30, maxMarks: 100 },
    create: { examId: tempExam.id, studentId: enrollment.studentId, subjectId: subject.id, marksObtained: 30, maxMarks: 100 },
  });
  const cellCount = await db.examResult.count({ where: { examId: tempExam.id, studentId: enrollment.studentId, subjectId: subject.id } });
  const cell = await db.examResult.findFirstOrThrow({ where: { examId: tempExam.id, studentId: enrollment.studentId, subjectId: subject.id } });
  log("upsert re-mark updates same row", cellCount === 1 && cell.marksObtained === 30);

  let dup = false;
  try {
    await db.examResult.create({ data: { examId: tempExam.id, studentId: enrollment.studentId, subjectId: subject.id, marksObtained: 1, maxMarks: 100 } });
  } catch {
    dup = true;
  }
  log("duplicate (exam,student,subject) rejected", dup);

  // Delete temp exam cascades to its results
  await db.exam.delete({ where: { id: tempExam.id } });
  const afterDelete = await db.examResult.count({ where: { examId: tempExam.id } });
  log("exam delete cascades to results", afterDelete === 0);

  // GPA computation for the demo student on the seeded exam
  if (seededExam) {
    const demoStudent = await db.student.findFirst({ where: { admissionNumber: "ADM-0001" } });
    const recs = await db.examResult.findMany({ where: { examId: seededExam.id, studentId: demoStudent!.id } });
    const gpa = recs.length ? recs.reduce((a, r) => a + gradeFromMarks(r.marksObtained, r.maxMarks).gpa, 0) / recs.length : 0;
    log("demo student GPA computed", recs.length > 0 && gpa > 0 && gpa <= 4, `${gpa.toFixed(2)} over ${recs.length} subjects`);
  }

  console.log(ok ? "\n✅ EXAMS/GRADES DATA-LAYER CHECKS PASSED" : "\n❌ SOME CHECKS FAILED");
  if (!ok) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
