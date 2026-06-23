import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Mail, Phone, Building2, Clock, ExternalLink } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { getManagedUser } from "@/lib/users/queries";
import { hasProfile } from "@/lib/users/roles";
import { ROLE_LABELS } from "@/lib/rbac/permissions";
import { USER_STATUS_LABELS, USER_STATUS_VARIANT } from "@/lib/users/status";
import { PageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/widgets";
import { UserStatusMenu } from "@/components/users/user-status-menu";
import { ResetPasswordButton } from "@/components/users/reset-password-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

export const metadata: Metadata = { title: "User" };

function profileLink(target: { role: string; studentProfile: { id: string } | null; teacherProfile: { id: string } | null; guardianProfile: { id: string } | null }) {
  if (target.studentProfile) return { href: `/dashboard/students/${target.studentProfile.id}`, label: "Open student profile" };
  if (target.teacherProfile) return { href: `/dashboard/teachers/${target.teacherProfile.id}`, label: "Open teacher profile" };
  if (target.guardianProfile) return { href: `/dashboard/guardians/${target.guardianProfile.id}`, label: "Open guardian profile" };
  return null;
}

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("user:view");
  const target = await getManagedUser(user, id);
  if (!target) notFound();

  const canManage = can(user, "user:manage");
  const isSelf = target.id === user.id;
  const link = profileLink(target);

  const detail = [
    { icon: Mail, label: "Email", value: target.email },
    { icon: Phone, label: "Phone", value: target.phone ?? "—" },
    { icon: Building2, label: "School", value: target.school?.name ?? "Platform (all schools)" },
    {
      icon: Clock,
      label: "Last sign-in",
      value: target.lastLoginAt
        ? target.lastLoginAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })
        : "Never",
    },
  ];

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/users">
          <ArrowLeft /> Back to users
        </Link>
      </Button>

      <PageHeader
        title={`${target.firstName} ${target.lastName}`}
        description={ROLE_LABELS[target.role]}
        actions={
          canManage ? (
            <div className="flex flex-wrap items-center gap-2">
              {!isSelf ? <UserStatusMenu id={target.id} current={target.status} /> : null}
              {!isSelf ? <ResetPasswordButton id={target.id} name={target.firstName} /> : null}
              <Button asChild variant="outline">
                <Link href={`/dashboard/users/${target.id}/edit`}>
                  <Pencil /> Edit
                </Link>
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <Avatar className="size-20 text-lg">
              <AvatarFallback>{initials(target.firstName, target.lastName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">
                {target.firstName} {target.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{target.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{ROLE_LABELS[target.role]}</Badge>
              <Badge variant={USER_STATUS_VARIANT[target.status]}>{USER_STATUS_LABELS[target.status]}</Badge>
            </div>
            {isSelf ? <p className="text-xs text-muted-foreground">This is your account.</p> : null}
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Panel title="Account details">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

          {hasProfile(target.role) && link ? (
            <Panel title="Linked profile" description="This account has a profile managed in its own module.">
              <Button asChild variant="outline">
                <Link href={link.href}>
                  <ExternalLink /> {link.label}
                </Link>
              </Button>
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
