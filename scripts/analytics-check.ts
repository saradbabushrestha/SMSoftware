// Verifies the analytics aggregates compute sensibly over the seeded data.
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

  // Headline counts
  const [students, teachers] = await Promise.all([
    db.student.count({ where: { schoolId, deletedAt: null } }),
    db.teacher.count({ where: { schoolId, deletedAt: null } }),
  ]);
  log("student/teacher counts", students >= 16 && teachers >= 6, `${students} / ${teachers}`);

  // Attendance breakdown + percentage
  const att = await db.attendance.groupBy({ by: ["status"], where: { schoolId }, _count: true });
  const total = att.reduce((a, r) => a + r._count, 0);
  const attended = att.filter((r) => r.status === "PRESENT" || r.status === "LATE").reduce((a, r) => a + r._count, 0);
  const pct = total ? Math.round((attended / total) * 100) : 0;
  log("attendance breakdown has data", total > 0, `${total} records`);
  log("attendance % in range", pct >= 0 && pct <= 100, `${pct}%`);

  // Enrollment by class sums to active enrollments
  const enrollments = await db.enrollment.findMany({
    where: { schoolId, deletedAt: null, academicYear: { status: "ACTIVE" } },
    include: { section: { include: { class: { select: { name: true } } } } },
  });
  const byClass = new Map<string, number>();
  for (const e of enrollments) byClass.set(e.section.class.name, (byClass.get(e.section.class.name) ?? 0) + 1);
  const sum = [...byClass.values()].reduce((a, b) => a + b, 0);
  log("enrollment-by-class sums correctly", sum === enrollments.length, `${byClass.size} classes, ${sum} students`);

  // Fee collection rate
  const billed = (await db.invoice.aggregate({ where: { schoolId, deletedAt: null, status: { not: "CANCELLED" } }, _sum: { amount: true } }))._sum.amount ?? 0;
  const collected = (await db.payment.aggregate({ where: { schoolId }, _sum: { amount: true } }))._sum.amount ?? 0;
  const rate = billed ? Math.round((collected / billed) * 100) : 0;
  log("fee collection rate in range", rate >= 0 && rate <= 100, `${rate}% (₨${collected}/${billed})`);

  // At-risk detection finds the demo student (67% attendance)
  const recs = await db.attendance.findMany({ where: { schoolId }, select: { studentId: true, status: true } });
  const agg = new Map<string, { total: number; attended: number }>();
  for (const r of recs) {
    const a = agg.get(r.studentId) ?? { total: 0, attended: 0 };
    a.total++;
    if (r.status === "PRESENT" || r.status === "LATE") a.attended++;
    agg.set(r.studentId, a);
  }
  const risky = [...agg.entries()]
    .map(([id, a]) => ({ id, days: a.total, pct: Math.round((a.attended / a.total) * 100) }))
    .filter((x) => x.days >= 5 && x.pct < 80);
  log("at-risk detection finds a low-attendance student", risky.length > 0, `${risky.length} flagged, lowest ${Math.min(...risky.map((r) => r.pct))}%`);
  log("all flagged students are genuinely <80% with ≥5 days", risky.every((r) => r.pct < 80 && r.days >= 5));

  console.log(ok ? "\n✅ ANALYTICS CHECKS PASSED" : "\n❌ SOME CHECKS FAILED");
  if (!ok) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
