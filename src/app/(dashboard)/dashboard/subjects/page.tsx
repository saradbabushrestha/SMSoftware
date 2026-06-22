import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Plus, School, Layers } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { listSubjects, getSubjectStats, getSubjectFormData } from "@/lib/subjects/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Pagination } from "@/components/dashboard/pagination";
import { SubjectsFilters } from "@/components/subjects/subjects-filters";
import { SubjectRowActions } from "@/components/subjects/subject-row-actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Subjects" };

export default async function SubjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; classId?: string; page?: string }>;
}) {
  const user = await requirePermission("subject:view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ rows, total, totalPages, pageSize }, stats, formData] = await Promise.all([
    listSubjects(user, { q: sp.q, classId: sp.classId, page }),
    getSubjectStats(user),
    getSubjectFormData(user),
  ]);

  const canManage = can(user, "subject:manage");
  const classOptions = formData.classes.map((c) => ({
    id: c.id,
    label: formData.isSuperAdmin ? `${c.school.name} · ${c.name}` : c.name,
  }));

  return (
    <>
      <PageHeader
        title="Subjects"
        description="Curriculum — subjects, credits and teaching staff."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/dashboard/subjects/new">
                <Plus /> Add subject
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total subjects" value={stats.total.toLocaleString()} icon={BookOpen} />
        <StatCard label="Class-linked" value={stats.classLinked.toLocaleString()} icon={Layers} accent="info" />
        <StatCard label="School-wide" value={stats.schoolWide.toLocaleString()} icon={School} accent="success" />
      </div>

      <Card className="p-4">
        <SubjectsFilters classes={classOptions} initialQ={sp.q} initialClassId={sp.classId} />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Credits</TableHead>
              <TableHead>Teachers</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  No subjects found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link href={`/dashboard/subjects/${s.id}`} className="block font-medium hover:underline">
                      {s.name}
                    </Link>
                    <span className="font-mono text-xs text-muted-foreground">{s.code}</span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {s.class ? (
                      <Badge variant="secondary">{s.class.name}</Badge>
                    ) : (
                      <span className="text-muted-foreground">School-wide</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{s.credits}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s._count.teachers > 0 ? s._count.teachers : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <SubjectRowActions id={s.id} name={s.name} canManage={canManage} />
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
