import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Mail, Phone, MapPin, Cake, Droplet, Flag, Users } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { getStudent } from "@/lib/students/queries";
import { STATUS_LABELS, STATUS_VARIANT, GENDER_LABELS, BLOOD_GROUP_LABELS, fullName } from "@/lib/students/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { Panel, EmptyState } from "@/components/dashboard/widgets";
import { StudentStatusMenu } from "@/components/students/student-status-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Student profile" };

function fmtDate(d: Date | null | undefined) {
  return d ? d.toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" }) : "—";
}

function titleCase(s: string) {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission("student:view");
  const student = await getStudent(user, id);
  if (!student) notFound();

  const name = fullName(student.user.firstName, student.user.lastName);
  const current = student.enrollments[0];
  const canEdit = can(user, "student:update");
  const canPromote = can(user, "student:promote");

  const personal = [
    { icon: Cake, label: "Date of birth", value: fmtDate(student.dateOfBirth) },
    { icon: Droplet, label: "Blood group", value: BLOOD_GROUP_LABELS[student.bloodGroup] },
    { icon: Flag, label: "Nationality", value: student.nationality ?? "—" },
    { icon: Phone, label: "Phone", value: student.user.phone ?? "—" },
    { icon: Mail, label: "Email", value: student.user.email },
    { icon: MapPin, label: "Address", value: student.address ?? "—" },
  ];

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/students">
          <ArrowLeft /> Back to students
        </Link>
      </Button>

      <PageHeader
        title={name}
        description={`Admission no. ${student.admissionNumber}`}
        actions={
          <div className="flex items-center gap-2">
            {canPromote ? <StudentStatusMenu id={student.id} current={student.status} /> : null}
            {canEdit ? (
              <Button asChild variant="outline">
                <Link href={`/dashboard/students/${student.id}/edit`}>
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
              <AvatarFallback>{initials(student.user.firstName, student.user.lastName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{name}</p>
              <p className="text-sm text-muted-foreground">{student.user.email}</p>
            </div>
            <Badge variant={STATUS_VARIANT[student.status]}>{STATUS_LABELS[student.status]}</Badge>
            <dl className="mt-2 w-full space-y-2 text-left text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Gender</dt>
                <dd className="font-medium">{GENDER_LABELS[student.gender]}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Class</dt>
                <dd className="font-medium">
                  {current ? `${current.section.class.name} · ${current.section.name}` : "Unassigned"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Roll no.</dt>
                <dd className="font-medium">{student.rollNumber ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Admitted</dt>
                <dd className="font-medium">{fmtDate(student.admittedOn)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">School</dt>
                <dd className="font-medium">{student.school.name}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Panel title="Personal details">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {personal.map((p) => (
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

          <Panel title="Enrollment history" description="Across academic years">
            {student.enrollments.length === 0 ? (
              <EmptyState title="No enrollment yet" description="Assign this student to a class to enroll them." />
            ) : (
              <ul className="divide-y">
                {student.enrollments.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium">
                        {e.section.class.name} · {e.section.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{e.academicYear.name}</p>
                    </div>
                    <Badge variant={STATUS_VARIANT[e.status]}>{STATUS_LABELS[e.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Guardians"
            description="Parents & guardians linked to this student"
            action={<Users className="size-4 text-muted-foreground" />}
          >
            {student.guardians.length === 0 ? (
              <EmptyState title="No guardians linked" />
            ) : (
              <ul className="divide-y">
                {student.guardians.map((sg) => (
                  <li key={sg.id} className="flex items-center gap-3 py-2.5">
                    <Avatar className="size-9">
                      <AvatarFallback>
                        {initials(sg.guardian.user.firstName, sg.guardian.user.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {fullName(sg.guardian.user.firstName, sg.guardian.user.lastName)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{sg.guardian.user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {sg.isPrimary ? <Badge variant="outline">Primary</Badge> : null}
                      <Badge variant="secondary">{titleCase(sg.relation)}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
