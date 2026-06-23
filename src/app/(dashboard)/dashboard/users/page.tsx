import type { Metadata } from "next";
import Link from "next/link";
import { UserCog, UserPlus, CircleCheck, ShieldCheck } from "lucide-react";
import type { UserRole, UserStatus } from "@prisma/client";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { listUsers, getUserStats } from "@/lib/users/queries";
import { hasProfile } from "@/lib/users/roles";
import { ROLE_LABELS } from "@/lib/rbac/permissions";
import { USER_STATUS_LABELS, USER_STATUS_VARIANT } from "@/lib/users/status";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Pagination } from "@/components/dashboard/pagination";
import { UsersFilters } from "@/components/users/users-filters";
import { UserRowActions } from "@/components/users/user-row-actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string; page?: string }>;
}) {
  const user = await requirePermission("user:view");
  const sp = await searchParams;
  const role = sp.role && sp.role in ROLE_LABELS ? (sp.role as UserRole) : undefined;
  const status = sp.status && sp.status in USER_STATUS_LABELS ? (sp.status as UserStatus) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ rows, total, totalPages, pageSize }, stats] = await Promise.all([
    listUsers(user, { q: sp.q, role, status, page }),
    getUserStats(user),
  ]);

  const canManage = can(user, "user:manage");

  return (
    <>
      <PageHeader
        title="Users"
        description="Accounts, roles and access."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/dashboard/users/new">
                <UserPlus /> Add user
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total users" value={stats.total.toLocaleString()} icon={UserCog} />
        <StatCard label="Active" value={stats.active.toLocaleString()} icon={CircleCheck} accent="success" />
        <StatCard label="Staff & admins" value={stats.staff.toLocaleString()} icon={ShieldCheck} accent="info" />
      </div>

      <Card className="p-4">
        <UsersFilters initialQ={sp.q} initialRole={sp.role} initialStatus={sp.status} />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarFallback>{initials(u.firstName, u.lastName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <Link href={`/dashboard/users/${u.id}`} className="block truncate text-sm font-medium hover:underline">
                          {u.firstName} {u.lastName}
                        </Link>
                        <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{ROLE_LABELS[u.role]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.school?.name ?? "Platform"}</TableCell>
                  <TableCell>
                    <Badge variant={USER_STATUS_VARIANT[u.status]}>{USER_STATUS_LABELS[u.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <UserRowActions
                      id={u.id}
                      name={`${u.firstName} ${u.lastName}`}
                      canManage={canManage}
                      canDelete={canManage && !hasProfile(u.role) && u.id !== user.id}
                    />
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
