import type { Metadata } from "next";
import Link from "next/link";
import { Users, UserPlus, CircleCheck, CalendarPlus } from "lucide-react";
import type { UserStatus } from "@prisma/client";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { listTeachers, getTeacherStats, getTeacherFormData } from "@/lib/teachers/queries";
import { USER_STATUS_LABELS, USER_STATUS_VARIANT, experienceLabel, fullName } from "@/lib/teachers/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Pagination } from "@/components/dashboard/pagination";
import { TeachersFilters } from "@/components/teachers/teachers-filters";
import { TeacherRowActions } from "@/components/teachers/teacher-row-actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Teachers" };

export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; subjectId?: string; page?: string }>;
}) {
  const user = await requirePermission("teacher:view");
  const sp = await searchParams;

  const status = sp.status && sp.status in USER_STATUS_LABELS ? (sp.status as UserStatus) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ rows, total, totalPages, pageSize }, stats, formData] = await Promise.all([
    listTeachers(user, { q: sp.q, status, subjectId: sp.subjectId, page }),
    getTeacherStats(user),
    getTeacherFormData(user),
  ]);

  const canManage = can(user, "teacher:manage");
  const subjectOptions = formData.subjects.map((s) => ({
    id: s.id,
    label: formData.isSuperAdmin ? `${s.school.name} · ${s.name}` : s.name,
  }));

  return (
    <>
      <PageHeader
        title="Teachers"
        description="Staff profiles, subjects and assignments."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/dashboard/teachers/new">
                <UserPlus /> Add teacher
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total teachers" value={stats.total.toLocaleString()} icon={Users} />
        <StatCard label="Active" value={stats.active.toLocaleString()} icon={CircleCheck} accent="success" />
        <StatCard label="New this month" value={stats.newThisMonth.toLocaleString()} icon={CalendarPlus} accent="info" />
      </div>

      <Card className="p-4">
        <TeachersFilters
          subjects={subjectOptions}
          initialQ={sp.q}
          initialStatus={sp.status}
          initialSubjectId={sp.subjectId}
        />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Teacher</TableHead>
              <TableHead>Employee&nbsp;ID</TableHead>
              <TableHead>Subjects</TableHead>
              <TableHead>Classes</TableHead>
              <TableHead>Experience</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  No teachers match your filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((t) => {
                const name = fullName(t.user.firstName, t.user.lastName);
                return (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback>{initials(t.user.firstName, t.user.lastName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <Link
                            href={`/dashboard/teachers/${t.id}`}
                            className="block truncate text-sm font-medium hover:underline"
                          >
                            {name}
                          </Link>
                          <span className="block truncate text-xs text-muted-foreground">{t.user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{t.employeeId}</TableCell>
                    <TableCell>
                      {t.subjects.length === 0 ? (
                        <span className="text-sm text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {t.subjects.slice(0, 3).map((s) => (
                            <Badge key={s.id} variant="secondary">
                              {s.code}
                            </Badge>
                          ))}
                          {t.subjects.length > 3 ? (
                            <Badge variant="outline">+{t.subjects.length - 3}</Badge>
                          ) : null}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t._count.sectionsLed > 0 ? `${t._count.sectionsLed} led` : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{experienceLabel(t.experienceYrs)}</TableCell>
                    <TableCell>
                      <Badge variant={USER_STATUS_VARIANT[t.user.status]}>
                        {USER_STATUS_LABELS[t.user.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <TeacherRowActions id={t.id} name={name} canManage={canManage} />
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
