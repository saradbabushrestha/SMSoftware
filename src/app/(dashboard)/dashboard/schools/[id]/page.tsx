import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Hash, Mail, Phone, MapPin, Globe, Clock, GraduationCap, Users, Contact, School as SchoolIcon, UserCog, CreditCard, Settings2 } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { getSchool, getSchoolStats } from "@/lib/schools/queries";
import { getSubscriptionPanel } from "@/lib/subscriptions/queries";
import { PLAN_LABELS, PLAN_VARIANT, STATUS_LABELS, STATUS_VARIANT, formatNpr, fmtDate, seatUsage } from "@/lib/subscriptions/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { Panel, ProgressBar, EmptyState } from "@/components/dashboard/widgets";
import { StatCard } from "@/components/dashboard/stat-card";
import { SchoolStatusToggle } from "@/components/schools/school-status-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "School" };

export default async function SchoolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("school:view");
  const school = await getSchool(user, id);
  if (!school) notFound();

  const canManage = can(user, "school:manage");
  const canManageSub = can(user, "subscription:manage");
  const stats = await getSchoolStats(school.id);
  const { subscription: sub, seatsUsed } = canManageSub
    ? await getSubscriptionPanel(school.id)
    : { subscription: null, seatsUsed: 0 };
  const usage = sub ? seatUsage(seatsUsed, sub.seats) : null;

  const detail = [
    { icon: Hash, label: "Code", value: school.code },
    { icon: Mail, label: "Email", value: school.email ?? "—" },
    { icon: Phone, label: "Phone", value: school.phone ?? "—" },
    { icon: MapPin, label: "City", value: school.city ?? "—" },
    { icon: Globe, label: "Country", value: school.country ?? "—" },
    { icon: Clock, label: "Timezone", value: school.timezone },
  ];

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/schools">
          <ArrowLeft /> Back to schools
        </Link>
      </Button>

      <PageHeader
        title={school.name}
        description={<Badge variant={school.isActive ? "success" : "secondary"}>{school.isActive ? "Active" : "Inactive"}</Badge>}
        actions={
          <div className="flex items-center gap-2">
            {canManage ? <SchoolStatusToggle id={school.id} active={school.isActive} /> : null}
            {canManage ? (
              <Button asChild variant="outline">
                <Link href={`/dashboard/schools/${school.id}/edit`}>
                  <Pencil /> Edit
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Students" value={stats.students.toLocaleString()} icon={GraduationCap} />
        <StatCard label="Teachers" value={stats.teachers.toLocaleString()} icon={Users} accent="info" />
        <StatCard label="Guardians" value={stats.guardians.toLocaleString()} icon={Contact} accent="success" />
        <StatCard label="Classes" value={stats.classes.toLocaleString()} icon={SchoolIcon} accent="warning" />
        <StatCard label="Accounts" value={stats.users.toLocaleString()} icon={UserCog} />
      </div>

      <Panel title="School details">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          {school.address ? (
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-xs text-muted-foreground">Address</dt>
              <dd className="text-sm font-medium">{school.address}</dd>
            </div>
          ) : null}
        </dl>
      </Panel>

      {canManageSub ? (
        <div className="mt-4">
          <Panel
            title="Subscription"
            description="Plan, billing and seat limits for this tenant"
            action={
              <Button asChild size="sm" variant="outline">
                <Link href={`/dashboard/schools/${school.id}/subscription`}>
                  <Settings2 /> Manage
                </Link>
              </Button>
            }
          >
            {!sub ? (
              <EmptyState
                title="No subscription yet"
                description="Set up a plan to track billing and seat limits for this school."
              />
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <CreditCard className="size-5" />
                  </span>
                  <Badge variant={PLAN_VARIANT[sub.plan]}>{PLAN_LABELS[sub.plan]}</Badge>
                  <Badge variant={STATUS_VARIANT[sub.status]}>{STATUS_LABELS[sub.status]}</Badge>
                  <span className="text-sm text-muted-foreground">{formatNpr(sub.priceNpr)} / month</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Seats used</span>
                    <span className={usage?.over ? "font-medium text-destructive" : "font-medium"}>
                      {seatsUsed.toLocaleString()} / {sub.seats.toLocaleString()}
                    </span>
                  </div>
                  <ProgressBar value={usage?.pct ?? 0} tone={usage?.tone ?? "primary"} />
                  {usage?.over ? <p className="text-xs text-destructive">Over the seat limit — upgrade the plan.</p> : null}
                </div>

                <dl className="grid grid-cols-2 gap-4 border-t pt-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-muted-foreground">Started</dt>
                    <dd className="font-medium">{fmtDate(sub.startedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Renews</dt>
                    <dd className="font-medium">{fmtDate(sub.renewsAt)}</dd>
                  </div>
                </dl>
                {sub.note ? <p className="border-t pt-3 text-xs text-muted-foreground">{sub.note}</p> : null}
              </div>
            )}
          </Panel>
        </div>
      ) : null}
    </>
  );
}
