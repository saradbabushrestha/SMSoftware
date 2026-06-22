import type { Metadata } from "next";
import { Mail, Phone, Building2, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/rbac/authorize";
import { db } from "@/lib/db";
import { ROLE_LABELS, PERMISSIONS } from "@/lib/rbac/permissions";
import { PageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/widgets";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Profile & account" };

export default async function ProfilePage() {
  const session = await requireUser();
  const user = await db.user.findUnique({
    where: { id: session.id },
    include: { school: true },
  });
  if (!user) return null;

  const detail = [
    { icon: Mail, label: "Email", value: user.email },
    { icon: Phone, label: "Phone", value: user.phone ?? "—" },
    { icon: Building2, label: "School", value: user.school?.name ?? "Platform (all schools)" },
    {
      icon: ShieldCheck,
      label: "Member since",
      value: user.createdAt.toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" }),
    },
  ];

  return (
    <>
      <PageHeader title="Profile & account" description="Your account details and access." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <Avatar className="size-20 text-lg">
              {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
              <AvatarFallback>{initials(user.firstName, user.lastName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Badge>{ROLE_LABELS[user.role]}</Badge>
          </CardContent>
        </Card>

        <Panel title="Account details" className="lg:col-span-2">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {detail.map((d) => (
              <div key={d.label} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <d.icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{d.label}</dt>
                  <dd className="truncate text-sm font-medium">{d.value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      <div className="mt-4">
        <Panel
          title="Your permissions"
          description={`${session.permissions.length} permissions granted by the ${ROLE_LABELS[user.role]} role`}
        >
          <div className="flex flex-wrap gap-2">
            {session.permissions.map((p) => (
              <span
                key={p}
                title={PERMISSIONS[p]}
                className="rounded-md border bg-muted/40 px-2 py-1 font-mono text-xs text-muted-foreground"
              >
                {p}
              </span>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
