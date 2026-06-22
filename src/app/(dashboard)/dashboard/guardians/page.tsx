import type { Metadata } from "next";
import Link from "next/link";
import { Contact, UserPlus, CircleCheck, Users } from "lucide-react";
import type { UserStatus } from "@prisma/client";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { listGuardians, getGuardianStats } from "@/lib/guardians/queries";
import { fullName } from "@/lib/guardians/display";
import { USER_STATUS_LABELS, USER_STATUS_VARIANT } from "@/lib/users/status";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Pagination } from "@/components/dashboard/pagination";
import { GuardiansFilters } from "@/components/guardians/guardians-filters";
import { GuardianRowActions } from "@/components/guardians/guardian-row-actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Guardians" };

export default async function GuardiansPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const user = await requirePermission("guardian:view");
  const sp = await searchParams;

  const status = sp.status && sp.status in USER_STATUS_LABELS ? (sp.status as UserStatus) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ rows, total, totalPages, pageSize }, stats] = await Promise.all([
    listGuardians(user, { q: sp.q, status, page }),
    getGuardianStats(user),
  ]);

  const canManage = can(user, "guardian:manage");

  return (
    <>
      <PageHeader
        title="Guardians"
        description="Parents and guardians linked to students."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/dashboard/guardians/new">
                <UserPlus /> Add guardian
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total guardians" value={stats.total.toLocaleString()} icon={Contact} />
        <StatCard label="Active" value={stats.active.toLocaleString()} icon={CircleCheck} accent="success" />
        <StatCard label="Linked to students" value={stats.linked.toLocaleString()} icon={Users} accent="info" />
      </div>

      <Card className="p-4">
        <GuardiansFilters initialQ={sp.q} initialStatus={sp.status} />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Guardian</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Occupation</TableHead>
              <TableHead>Children</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  No guardians match your filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((g) => {
                const name = fullName(g.user.firstName, g.user.lastName);
                return (
                  <TableRow key={g.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback>{initials(g.user.firstName, g.user.lastName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <Link href={`/dashboard/guardians/${g.id}`} className="block truncate text-sm font-medium hover:underline">
                            {name}
                          </Link>
                          <span className="block truncate text-xs text-muted-foreground">{g.user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{g.user.phone ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{g.occupation ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      {g._count.students > 0 ? (
                        <Badge variant="secondary">{g._count.students}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={USER_STATUS_VARIANT[g.user.status]}>
                        {USER_STATUS_LABELS[g.user.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <GuardianRowActions id={g.id} name={name} canManage={canManage} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} />
      </Card>
    </>
  );
}
