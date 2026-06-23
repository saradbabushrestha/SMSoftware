import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, User as UserIcon, Hash, Globe, Monitor, Building2, Clock } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { getAuditLog } from "@/lib/audit/queries";
import { actionTone, actionCategory, humanizeAction } from "@/lib/audit/display";
import { ROLE_LABELS } from "@/lib/rbac/permissions";
import { PageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/widgets";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Audit event" };

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("audit:view");
  const log = await getAuditLog(user, id);
  if (!log) notFound();

  const detail = [
    {
      icon: UserIcon,
      label: "Actor",
      value: log.user ? `${log.user.firstName} ${log.user.lastName} · ${ROLE_LABELS[log.user.role]}` : "System",
    },
    { icon: Clock, label: "When", value: log.createdAt.toLocaleString("en", { dateStyle: "full", timeStyle: "medium" }) },
    { icon: Hash, label: "Entity", value: log.entityType ? `${log.entityType}${log.entityId ? ` · ${log.entityId}` : ""}` : "—" },
    { icon: Building2, label: "School", value: log.school?.name ?? "Platform" },
    { icon: Globe, label: "IP address", value: log.ip ?? "—" },
    { icon: Monitor, label: "User agent", value: log.userAgent ?? "—" },
  ];

  const metadata = log.metadata as Record<string, unknown> | null;

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/audit">
          <ArrowLeft /> Back to audit logs
        </Link>
      </Button>

      <PageHeader
        title={humanizeAction(log.action)}
        description={
          <span className="inline-flex items-center gap-2">
            <Badge variant={actionTone(log.action)}>{actionCategory(log.action)}</Badge>
            <span className="font-mono text-xs text-muted-foreground">{log.action}</span>
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
            {detail.map((d) => (
              <div key={d.label} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <d.icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{d.label}</p>
                  <p className="text-sm font-medium break-words">{d.value}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Panel title="Metadata" className="lg:col-span-1">
          {metadata && Object.keys(metadata).length > 0 ? (
            <pre className="scrollbar-thin overflow-x-auto rounded-md bg-muted/50 p-3 font-mono text-xs">
              {JSON.stringify(metadata, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">No additional metadata.</p>
          )}
        </Panel>
      </div>
    </>
  );
}
