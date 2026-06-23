import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Mail, Phone, GraduationCap, Briefcase, CalendarDays, BookOpen, School, Plus } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { getTeacher } from "@/lib/teachers/queries";
import { listEvaluations, evaluationSummary } from "@/lib/evaluations/queries";
import { USER_STATUS_LABELS, USER_STATUS_VARIANT, experienceLabel, fullName } from "@/lib/teachers/display";
import { overallScore, ratingVariant } from "@/lib/evaluations/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { Panel, EmptyState } from "@/components/dashboard/widgets";
import { RatingStars } from "@/components/evaluations/rating-stars";
import { TeacherStatusMenu } from "@/components/teachers/teacher-status-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Teacher profile" };

function fmtDate(d: Date | null | undefined) {
  return d ? d.toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" }) : "—";
}

export default async function TeacherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission("teacher:view");
  const teacher = await getTeacher(user, id);
  if (!teacher) notFound();

  const name = fullName(teacher.user.firstName, teacher.user.lastName);
  const canManage = can(user, "teacher:manage");
  const canEvaluate = can(user, "teacher:evaluate");
  const [evaluations, evalSummary] = canEvaluate
    ? await Promise.all([listEvaluations(user, teacher.id), evaluationSummary(user, teacher.id)])
    : [[], { count: 0, average: 0 }];

  const professional = [
    { icon: Briefcase, label: "Experience", value: experienceLabel(teacher.experienceYrs) },
    { icon: GraduationCap, label: "Qualification", value: teacher.qualification ?? "—" },
    { icon: CalendarDays, label: "Joined", value: fmtDate(teacher.joinedOn) },
    { icon: Mail, label: "Email", value: teacher.user.email },
    { icon: Phone, label: "Phone", value: teacher.user.phone ?? "—" },
    { icon: School, label: "School", value: teacher.school.name },
  ];

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/teachers">
          <ArrowLeft /> Back to teachers
        </Link>
      </Button>

      <PageHeader
        title={name}
        description={`Employee ID ${teacher.employeeId}`}
        actions={
          <div className="flex items-center gap-2">
            {canManage ? <TeacherStatusMenu id={teacher.id} current={teacher.user.status} /> : null}
            {canManage ? (
              <Button asChild variant="outline">
                <Link href={`/dashboard/teachers/${teacher.id}/edit`}>
                  <Pencil /> Edit
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <Avatar className="size-20 text-lg">
              <AvatarFallback>{initials(teacher.user.firstName, teacher.user.lastName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{name}</p>
              <p className="text-sm text-muted-foreground">{teacher.user.email}</p>
            </div>
            <Badge variant={USER_STATUS_VARIANT[teacher.user.status]}>
              {USER_STATUS_LABELS[teacher.user.status]}
            </Badge>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Panel title="Professional details">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {professional.map((p) => (
                <div key={p.label} className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <p.icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{p.label}</dt>
                    <dd className="text-sm font-medium break-words">{p.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel
            title="Subjects taught"
            action={<BookOpen className="size-4 text-muted-foreground" />}
          >
            {teacher.subjects.length === 0 ? (
              <EmptyState title="No subjects assigned" description="Edit this teacher to assign subjects." />
            ) : (
              <div className="flex flex-wrap gap-2">
                {teacher.subjects.map((s) => (
                  <Badge key={s.id} variant="default">
                    {s.name} <span className="ml-1 opacity-70">· {s.code}</span>
                  </Badge>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Classes led" description="Sections where this teacher is the class teacher">
            {teacher.sectionsLed.length === 0 ? (
              <EmptyState title="Not a class teacher" />
            ) : (
              <ul className="divide-y">
                {teacher.sectionsLed.map((sec) => (
                  <li key={sec.id} className="flex items-center justify-between py-2.5">
                    <p className="text-sm font-medium">
                      {sec.class.name} · {sec.name}
                    </p>
                    <Badge variant="outline">Class teacher</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {canEvaluate ? (
            <Panel
              title="Performance evaluations"
              description={
                evalSummary.count > 0
                  ? `${evalSummary.count} on record · average ${evalSummary.average.toFixed(1)} / 5`
                  : "Confidential — visible to admins & principals"
              }
              action={
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/teachers/${teacher.id}/evaluations/new`}>
                    <Plus /> New
                  </Link>
                </Button>
              }
            >
              {evaluations.length === 0 ? (
                <EmptyState title="No evaluations yet" description="Record a performance review for this teacher." />
              ) : (
                <ul className="divide-y">
                  {evaluations.map((ev) => {
                    const overall = overallScore(ev);
                    return (
                      <li key={ev.id}>
                        <Link
                          href={`/dashboard/teachers/${teacher.id}/evaluations/${ev.id}`}
                          className="flex items-center justify-between gap-3 py-2.5 transition-opacity hover:opacity-80"
                        >
                          <div>
                            <p className="text-sm font-medium">{ev.period}</p>
                            <p className="text-xs text-muted-foreground">{fmtDate(ev.createdAt)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <RatingStars score={overall} />
                            <Badge variant={ratingVariant(overall)}>{overall.toFixed(1)}</Badge>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
