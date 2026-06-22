import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Mail, Phone, Briefcase, MapPin, School } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { getGuardian, getLinkableStudents } from "@/lib/guardians/queries";
import { fullName } from "@/lib/guardians/display";
import { USER_STATUS_LABELS, USER_STATUS_VARIANT } from "@/lib/users/status";
import { PageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/widgets";
import { GuardianStatusMenu } from "@/components/guardians/guardian-status-menu";
import { StudentsLinker, type StudentLinkView } from "@/components/guardians/students-linker";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Guardian profile" };

export default async function GuardianDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission("guardian:view");
  const guardian = await getGuardian(user, id);
  if (!guardian) notFound();

  const name = fullName(guardian.user.firstName, guardian.user.lastName);
  const canManage = can(user, "guardian:manage");
  const linkableStudents = canManage ? await getLinkableStudents(guardian.schoolId, guardian.id) : [];

  const links: StudentLinkView[] = guardian.students.map((sg) => ({
    id: sg.id,
    studentId: sg.studentId,
    studentName: fullName(sg.student.user.firstName, sg.student.user.lastName),
    admissionNumber: sg.student.admissionNumber,
    relation: sg.relation,
    isPrimary: sg.isPrimary,
  }));

  const detail = [
    { icon: Mail, label: "Email", value: guardian.user.email },
    { icon: Phone, label: "Phone", value: guardian.user.phone ?? "—" },
    { icon: Briefcase, label: "Occupation", value: guardian.occupation ?? "—" },
    { icon: School, label: "School", value: guardian.school.name },
    { icon: MapPin, label: "Address", value: guardian.address ?? "—" },
  ];

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/guardians">
          <ArrowLeft /> Back to guardians
        </Link>
      </Button>

      <PageHeader
        title={name}
        description="Parent / guardian"
        actions={
          <div className="flex items-center gap-2">
            {canManage ? <GuardianStatusMenu id={guardian.id} current={guardian.user.status} /> : null}
            {canManage ? (
              <Button asChild variant="outline">
                <Link href={`/dashboard/guardians/${guardian.id}/edit`}>
                  <Pencil /> Edit
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Card className="p-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-lg font-semibold">{name}</p>
              <Badge variant={USER_STATUS_VARIANT[guardian.user.status]}>
                {USER_STATUS_LABELS[guardian.user.status]}
              </Badge>
            </div>
          </Card>
          <Panel title="Contact details">
            <dl className="space-y-4">
              {detail.map((d) => (
                <div key={d.label} className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <d.icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{d.label}</dt>
                    <dd className="text-sm font-medium break-words">{d.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </Panel>
        </div>

        <Card className="p-4 lg:col-span-2">
          <StudentsLinker
            guardianId={guardian.id}
            links={links}
            linkableStudents={linkableStudents}
            canManage={canManage}
          />
        </Card>
      </div>
    </>
  );
}
