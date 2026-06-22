import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, UserPlus, CircleCheck, CalendarPlus } from "lucide-react";
import type { EnrollmentStatus } from "@prisma/client";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { listStudents, getStudentStats, getStudentFormData } from "@/lib/students/queries";
import { STATUS_LABELS, STATUS_VARIANT, fullName } from "@/lib/students/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Pagination } from "@/components/dashboard/pagination";
import { StudentsFilters } from "@/components/students/students-filters";
import { StudentRowActions } from "@/components/students/student-row-actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Students" };

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; classId?: string; page?: string }>;
}) {
  const user = await requirePermission("student:view");
  const sp = await searchParams;

  const status = sp.status && sp.status in STATUS_LABELS ? (sp.status as EnrollmentStatus) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ rows, total, totalPages, pageSize }, stats, formData] = await Promise.all([
    listStudents(user, { q: sp.q, status, classId: sp.classId, page }),
    getStudentStats(user),
    getStudentFormData(user),
  ]);

  const canCreate = can(user, "student:create");
  const canEdit = can(user, "student:update");
  const canDelete = can(user, "student:delete");

  const classOptions = formData.classes.map((c) => ({
    id: c.id,
    label: formData.isSuperAdmin ? `${c.school.name} · ${c.name}` : c.name,
  }));

  return (
    <>
      <PageHeader
        title="Students"
        description="Admissions, profiles and enrollment."
        actions={
          canCreate ? (
            <Button asChild>
              <Link href="/dashboard/students/new">
                <UserPlus /> Add student
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total students" value={stats.total.toLocaleString()} icon={GraduationCap} />
        <StatCard label="Active" value={stats.active.toLocaleString()} icon={CircleCheck} accent="success" />
        <StatCard label="New this month" value={stats.newThisMonth.toLocaleString()} icon={CalendarPlus} accent="info" />
      </div>

      <Card className="p-4">
        <StudentsFilters
          classes={classOptions}
          initialQ={sp.q}
          initialStatus={sp.status}
          initialClassId={sp.classId}
        />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Admission&nbsp;No.</TableHead>
              <TableHead>Class · Section</TableHead>
              <TableHead>Roll</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  No students match your filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((s) => {
                const enr = s.enrollments[0];
                const klass = enr ? `${enr.section.class.name} · ${enr.section.name}` : "—";
                const name = fullName(s.user.firstName, s.user.lastName);
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback>{initials(s.user.firstName, s.user.lastName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <Link
                            href={`/dashboard/students/${s.id}`}
                            className="block truncate text-sm font-medium hover:underline"
                          >
                            {name}
                          </Link>
                          <span className="block truncate text-xs text-muted-foreground">
                            {s.user.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{s.admissionNumber}</TableCell>
                    <TableCell className="text-sm">{klass}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.rollNumber ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[s.status]}>{STATUS_LABELS[s.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <StudentRowActions id={s.id} name={name} canEdit={canEdit} canDelete={canDelete} />
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
