import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, BookOpen, School, CalendarClock, ListChecks } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { getAssignment, getAssignmentSubmissions, getMySubmission, studentContext } from "@/lib/assignments/queries";
import { isOverdue, formatDue, gradePercent, SUBMISSION_STATUS_LABELS, SUBMISSION_STATUS_VARIANT } from "@/lib/assignments/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { Panel, EmptyState } from "@/components/dashboard/widgets";
import { SubmitForm } from "@/components/assignments/submit-form";
import { GradeDialog } from "@/components/assignments/grade-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Assignment" };

export default async function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("assignment:view");
  const assignment = await getAssignment(user, id);
  if (!assignment) notFound();

  const canManage = can(user, "assignment:manage");
  const isStudent = user.role === "STUDENT";
  const overdue = isOverdue(assignment.dueDate);

  const meta = [
    { icon: BookOpen, label: "Subject", value: assignment.subject.name },
    { icon: School, label: "Class", value: `${assignment.section.class.name} · ${assignment.section.name}` },
    { icon: CalendarClock, label: "Due", value: formatDue(assignment.dueDate) },
    { icon: ListChecks, label: "Points", value: String(assignment.maxPoints) },
  ];

  // Student-specific submission state
  let canSubmit = false;
  let mySubmission: Awaited<ReturnType<typeof getMySubmission>> = null;
  if (isStudent) {
    const ctx = await studentContext(user);
    canSubmit = !!ctx.studentId && ctx.sectionIds.includes(assignment.sectionId);
    if (ctx.studentId) mySubmission = await getMySubmission(assignment.id, ctx.studentId);
  }

  // Staff submissions roster
  const submissions = !isStudent ? await getAssignmentSubmissions(assignment.id, assignment.sectionId) : [];
  const submittedCount = submissions.filter((s) => s.submission).length;

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/assignments">
          <ArrowLeft /> Back to assignments
        </Link>
      </Button>

      <PageHeader
        title={assignment.title}
        description={
          <span className="inline-flex items-center gap-2">
            <Badge variant="secondary">{assignment.subject.code}</Badge>
            <Badge variant={overdue ? "secondary" : "info"}>{overdue ? "Past due" : "Open"}</Badge>
          </span>
        }
        actions={
          canManage ? (
            <Button asChild variant="outline">
              <Link href={`/dashboard/assignments/${assignment.id}/edit`}>
                <Pencil /> Edit
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-5 p-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
            </div>
            {assignment.description ? (
              <div className="border-t pt-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Instructions</p>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{assignment.description}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="lg:col-span-1">
          {isStudent ? (
            <Panel title="Your submission">
              {canSubmit ? (
                <SubmitForm
                  assignmentId={assignment.id}
                  content={mySubmission?.content ?? null}
                  graded={mySubmission?.status === "GRADED"}
                  grade={mySubmission?.grade ?? null}
                  feedback={mySubmission?.feedback ?? null}
                  maxPoints={assignment.maxPoints}
                />
              ) : (
                <EmptyState title="Not your class" description="This assignment is for a different section." />
              )}
            </Panel>
          ) : (
            <Panel title="Submissions" description={`${submittedCount}/${submissions.length} submitted`}>
              {submissions.length === 0 ? (
                <EmptyState title="No students enrolled" />
              ) : null}
            </Panel>
          )}
        </div>
      </div>

      {!isStudent && submissions.length > 0 ? (
        <Card className="mt-4 p-4">
          <h3 className="mb-3 font-semibold">Submissions</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Grade</TableHead>
                {canManage ? <TableHead className="text-right">Action</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((s) => (
                <TableRow key={s.studentId}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>
                    {s.submission ? (
                      <Badge variant={SUBMISSION_STATUS_VARIANT[s.submission.status]}>
                        {SUBMISSION_STATUS_LABELS[s.submission.status]}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">{isOverdue(assignment.dueDate) ? "Missing" : "Pending"}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {s.submission?.grade != null
                      ? `${s.submission.grade}/${assignment.maxPoints} · ${gradePercent(s.submission.grade, assignment.maxPoints)}%`
                      : "—"}
                  </TableCell>
                  {canManage ? (
                    <TableCell className="text-right">
                      {s.submission ? (
                        <GradeDialog
                          submissionId={s.submission.id}
                          studentName={s.name}
                          content={s.submission.content}
                          maxPoints={assignment.maxPoints}
                          grade={s.submission.grade}
                          feedback={s.submission.feedback}
                          graded={s.submission.status === "GRADED"}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">No submission</span>
                      )}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : null}
    </>
  );
}
