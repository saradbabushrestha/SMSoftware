import type { Metadata } from "next";
import { requirePermission } from "@/lib/rbac/authorize";
import { db } from "@/lib/db";
import { studentReport } from "@/lib/grades/queries";
import { listExams, getExamResults } from "@/lib/exams/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { ReportView } from "@/components/grades/report-view";
import { ExamPicker } from "@/components/grades/exam-picker";
import { ExamResultsTable } from "@/components/exams/exam-results-table";
import { Panel } from "@/components/dashboard/widgets";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Grades" };

export default async function GradesPage({
  searchParams,
}: {
  searchParams: Promise<{ examId?: string }>;
}) {
  const user = await requirePermission("grade:view");
  const sp = await searchParams;

  // ─── Student self-view ───
  if (user.role === "STUDENT") {
    const student = await db.student.findFirst({ where: { userId: user.id, deletedAt: null }, select: { id: true } });
    const report = student ? await studentReport(student.id) : { groups: [], overallGpa: 0 };
    return (
      <>
        <PageHeader title="My grades" description="Your published results and GPA." />
        <ReportView report={report} />
      </>
    );
  }

  // ─── Parent self-view (per child) ───
  if (user.role === "PARENT") {
    const guardian = await db.guardian.findFirst({
      where: { userId: user.id, deletedAt: null },
      include: { students: { include: { student: { include: { user: true } } } } },
    });
    const children = (guardian?.students ?? []).filter((sg) => !sg.student.deletedAt);
    const reports = await Promise.all(children.map((c) => studentReport(c.studentId)));
    return (
      <>
        <PageHeader title="Grades" description="Your children's published results." />
        {children.length === 0 ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">No children linked to your account.</CardContent></Card>
        ) : (
          <div className="space-y-6">
            {children.map((c, i) => (
              <div key={c.studentId} className="space-y-3">
                <h2 className="text-lg font-semibold">
                  {c.student.user.firstName} {c.student.user.lastName}
                </h2>
                <ReportView report={reports[i]} />
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  // ─── Staff: per-exam results ───
  const { rows: exams } = await listExams(user, { page: 1 });
  const examOptions = exams.map((e) => ({ id: e.id, label: `${e.name} · ${e.class.name}` }));
  const results = sp.examId ? await getExamResults(user, sp.examId) : null;

  return (
    <>
      <PageHeader title="Grades" description="Exam results by class." />
      <Card className="mb-4 p-4">
        <ExamPicker exams={examOptions} examId={sp.examId} />
      </Card>

      {!sp.examId ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Select an exam to view its results.</CardContent></Card>
      ) : !results ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">That exam was not found.</CardContent></Card>
      ) : (
        <Panel title={results.exam.name} description={`${results.exam.class.name} · ${results.exam.published ? "Published" : "Draft"}`}>
          <ExamResultsTable subjects={results.subjects} students={results.students} />
        </Panel>
      )}
    </>
  );
}
