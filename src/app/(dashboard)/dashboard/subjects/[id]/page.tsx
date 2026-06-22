import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Hash, Award, School, Users } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { getSubject } from "@/lib/subjects/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { Panel, EmptyState } from "@/components/dashboard/widgets";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Subject" };

export default async function SubjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission("subject:view");
  const subject = await getSubject(user, id);
  if (!subject) notFound();

  const canManage = can(user, "subject:manage");

  const meta = [
    { icon: Hash, label: "Code", value: subject.code },
    { icon: Award, label: "Credits", value: String(subject.credits) },
    { icon: School, label: "Class", value: subject.class ? subject.class.name : "School-wide" },
  ];

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/subjects">
          <ArrowLeft /> Back to subjects
        </Link>
      </Button>

      <PageHeader
        title={subject.name}
        description={subject.school.name}
        actions={
          canManage ? (
            <Button asChild variant="outline">
              <Link href={`/dashboard/subjects/${subject.id}/edit`}>
                <Pencil /> Edit
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="space-y-4 p-6">
            {meta.map((m) => (
              <div key={m.label} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <m.icon className="size-4" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-sm font-medium">{m.value}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Panel
            title="Teaching staff"
            description="Teachers assigned to this subject"
            action={<Users className="size-4 text-muted-foreground" />}
          >
            {subject.teachers.length === 0 ? (
              <EmptyState title="No teachers assigned" description={canManage ? "Edit this subject to assign teachers." : undefined} />
            ) : (
              <ul className="divide-y">
                {subject.teachers.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-2.5">
                    <Avatar className="size-9">
                      <AvatarFallback>{initials(t.user.firstName, t.user.lastName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <Link href={`/dashboard/teachers/${t.id}`} className="block truncate text-sm font-medium hover:underline">
                        {t.user.firstName} {t.user.lastName}
                      </Link>
                      <span className="block truncate text-xs text-muted-foreground">{t.user.email}</span>
                    </div>
                    <Badge variant="outline">{t.employeeId}</Badge>
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
