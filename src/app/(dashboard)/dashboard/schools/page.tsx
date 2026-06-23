import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Plus, CircleCheck, GraduationCap } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { listSchools, getPlatformStats } from "@/lib/schools/queries";
import type { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import { getSubscriptionsFor } from "@/lib/subscriptions/queries";
import { PLAN_LABELS, PLAN_VARIANT, STATUS_LABELS } from "@/lib/subscriptions/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Pagination } from "@/components/dashboard/pagination";
import { SchoolsFilters } from "@/components/schools/schools-filters";
import { SchoolRowActions } from "@/components/schools/school-row-actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Schools" };

export default async function SchoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await requirePermission("school:view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const canManage = can(user, "school:manage");

  const canManageSub = can(user, "subscription:manage");

  const [{ rows, total, totalPages, pageSize }, stats] = await Promise.all([
    listSchools(user, { q: sp.q, page }),
    getPlatformStats(user),
  ]);

  const subs: Map<string, { plan: SubscriptionPlan; status: SubscriptionStatus }> = canManageSub
    ? await getSubscriptionsFor(rows.map((s) => s.id))
    : new Map();

  return (
    <>
      <PageHeader
        title="Schools"
        description="Platform-wide schools and tenancy."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/dashboard/schools/new">
                <Plus /> Add school
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Schools" value={stats.schools.toLocaleString()} icon={Building2} />
        <StatCard label="Active" value={stats.active.toLocaleString()} icon={CircleCheck} accent="success" />
        <StatCard label="Students" value={stats.students.toLocaleString()} icon={GraduationCap} accent="info" />
      </div>

      <Card className="p-4">
        <SchoolsFilters initialQ={sp.q} />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>School</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Students</TableHead>
              <TableHead>Teachers</TableHead>
              {canManageSub ? <TableHead>Plan</TableHead> : null}
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManageSub ? 7 : 6} className="py-12 text-center text-sm text-muted-foreground">
                  No schools found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link href={`/dashboard/schools/${s.id}`} className="block font-medium hover:underline">
                      {s.name}
                    </Link>
                    <span className="font-mono text-xs text-muted-foreground">{s.code}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.city ?? "—"}</TableCell>
                  <TableCell className="text-sm">{s._count.students}</TableCell>
                  <TableCell className="text-sm">{s._count.teachers}</TableCell>
                  {canManageSub ? (
                    <TableCell>
                      {subs.get(s.id) ? (
                        <span className="flex items-center gap-1.5">
                          <Badge variant={PLAN_VARIANT[subs.get(s.id)!.plan]}>{PLAN_LABELS[subs.get(s.id)!.plan]}</Badge>
                          <span className="text-xs text-muted-foreground">{STATUS_LABELS[subs.get(s.id)!.status]}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <Badge variant={s.isActive ? "success" : "secondary"}>{s.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <SchoolRowActions id={s.id} name={s.name} canManage={canManage} canDelete={canManage && s.id !== user.schoolId} />
                  </TableCell>
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
