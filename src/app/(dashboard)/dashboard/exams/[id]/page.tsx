import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, School, CalendarDays, Hash, ListChecks } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { getExam, getExamSubjects, getGradeRoster, getExamResults } from "@/lib/exams/queries";
import { EXAM_TYPE_LABELS, EXAM_TYPE_VARIANT } from "@/lib/exams/grading";
import { PageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/widgets";
import { GradeEntry } from "@/components/exams/grade-entry";
import { ExamResultsTable } from "@/components/exams/exam-results-table";
import { PublishToggle } from "@/components/exams/publish-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Exam" };

function fmtDate(d: Date | null) {
  return d ? d.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : "Not scheduled";
}

export default async function ExamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ subjectId?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requirePermission("exam:view");
  const exam = await getExam(user, id);
  if (!exam) notFound();

  const canExamManage = can(user, "exam:manage");
  const canGrade = can(user, "grade:manage");
  const isStaff = user.role !== "STUDENT" && user.role !== "PARENT";

  const meta = [
    { icon: Hash, label: "Type", value: EXAM_TYPE_LABELS[exam.type] },
    { icon: School, label: "Class", value: exam.class.name },
    { icon: CalendarDays, label: "Date", value: fmtDate(exam.examDate) },
    { icon: ListChecks, label: "Max marks", value: String(exam.maxMarks) },
  ];

  // Data for the relevant view.
  const subjects = canGrade ? await getExamSubjects(exam) : [];
  const roster = canGrade && sp.subjectId ? await getGradeRoster(user, id, sp.subjectId) : null;
  const results = !canGrade && isStaff ? await getExamResults(user, id) : null;

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/exams">
          <ArrowLeft /> Back to exams
        </Link>
      </Button>

      <PageHeader
        title={exam.name}
        description={<Badge variant={EXAM_TYPE_VARIANT[exam.type]}>{EXAM_TYPE_LABELS[exam.type]}</Badge>}
        actions={
          <div className="flex items-center gap-2">
            {canExamManage ? <PublishToggle examId={exam.id} published={exam.published} /> : null}
            {canExamManage ? (
              <Button asChild variant="outline">
                <Link href={`/dashboard/exams/${exam.id}/edit`}>
                  <Pencil /> Edit
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
          {meta.map((m) => (
            <div key={m.label} className="flex items-start gap-3">
              <span className="mt-0.5 grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
                <m.icon className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="truncate text-sm font-medium">{m.value}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {canGrade ? (
        <Card className="p-4">
          <h3 className="mb-3 font-semibold">Enter grades</h3>
          {subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No subjects for this class yet — add subjects first.</p>
          ) : (
            <GradeEntry
              examId={exam.id}
              subjects={subjects}
              subjectId={sp.subjectId}
              rows={roster?.rows ?? []}
              maxMarks={exam.maxMarks}
            />
          )}
        </Card>
      ) : isStaff && results ? (
        <Panel title="Results" description={exam.published ? "Published" : "Draft — not yet visible to students"}>
          <ExamResultsTable subjects={results.subjects} students={results.students} />
        </Panel>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {exam.published
              ? "Results are published — view your grades on the Grades page."
              : "Results for this exam haven't been published yet."}
          </CardContent>
        </Card>
      )}
    </>
  );
}
