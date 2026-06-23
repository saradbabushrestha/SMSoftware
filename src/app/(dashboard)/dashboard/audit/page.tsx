import type { Metadata } from "next";
import Link from "next/link";
import { ScrollText, Activity, CalendarClock, LogIn } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { listAuditLogs, getAuditStats } from "@/lib/audit/queries";
import { actionTone, actionCategory } from "@/lib/audit/display";
import { ROLE_LABELS } from "@/lib/rbac/permissions";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Pagination } from "@/components/dashboard/pagination";
import { AuditFilters } from "@/components/audit/audit-filters";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Audit logs" };

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; range?: string; page?: string }>;
}) {
  const user = await requirePermission("audit:view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ rows, total, totalPages, pageSize }, stats] = await Promise.all([
    listAuditLogs(user, { q: sp.q, range: sp.range, page }),
    getAuditStats(user),
  ]);

  return (
    <>
      <PageHeader title="Audit logs" description="Security and activity trail across the platform." />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total events" value={stats.total.toLocaleString()} icon={ScrollText} />
        <StatCard label="Today" value={stats.today.toLocaleString()} icon={CalendarClock} accent="info" />
        <StatCard label="Sign-ins (7d)" value={stats.logins.toLocaleString()} icon={LogIn} accent="success" />
      </div>

      <Card className="p-4">
        <AuditFilters initialQ={sp.q} initialRange={sp.range} />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  <Activity className="mx-auto mb-2 size-6 opacity-60" />
                  No activity in this range.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((log) => (
                <TableRow key={log.id} className="cursor-pointer">
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    <Link href={`/dashboard/audit/${log.id}`} className="hover:underline">
                      {log.createdAt.toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.user ? (
                      <span>
                        {log.user.firstName} {log.user.lastName}
                        <span className="ml-1 text-xs text-muted-foreground">· {ROLE_LABELS[log.user.role]}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">System</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={actionTone(log.action)}>{actionCategory(log.action)}</Badge>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">{log.action}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.entityType ? log.entityType : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{log.ip ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} />
      </Card>
    </>
  );
}
