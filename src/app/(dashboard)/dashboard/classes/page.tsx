import type { Metadata } from "next";
import Link from "next/link";
import { School, Plus, Layers, GraduationCap } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { listClasses, getClassStats } from "@/lib/classes/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Pagination } from "@/components/dashboard/pagination";
import { ClassesFilters } from "@/components/classes/classes-filters";
import { ClassRowActions } from "@/components/classes/class-row-actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Classes" };

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await requirePermission("class:view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ rows, total, totalPages, pageSize }, stats] = await Promise.all([
    listClasses(user, { q: sp.q, page }),
    getClassStats(user),
  ]);

  const canManage = can(user, "class:manage");

  return (
    <>
      <PageHeader
        title="Classes & sections"
        description="Academic structure — classes, sections and capacity."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/dashboard/classes/new">
                <Plus /> Add class
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Classes" value={stats.classes.toLocaleString()} icon={School} />
        <StatCard label="Sections" value={stats.sections.toLocaleString()} icon={Layers} accent="info" />
        <StatCard label="Enrolled students" value={stats.students.toLocaleString()} icon={GraduationCap} accent="success" />
      </div>

      <Card className="p-4">
        <ClassesFilters initialQ={sp.q} />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Class</TableHead>
              <TableHead>Stream</TableHead>
              <TableHead>Sections</TableHead>
              <TableHead>Students</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  No classes found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((c) => {
                const students = c.sections.reduce((acc, s) => acc + s._count.enrollments, 0);
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/dashboard/classes/${c.id}`} className="block font-medium hover:underline">
                        {c.name}
                      </Link>
                      <span className="font-mono text-xs text-muted-foreground">{c.code}</span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.stream ? <Badge variant="secondary">{c.stream}</Badge> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">{c.sections.length}</TableCell>
                    <TableCell className="text-sm">{students}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.capacity}</TableCell>
                    <TableCell className="text-right">
                      <ClassRowActions id={c.id} name={c.name} sectionCount={c.sections.length} canManage={canManage} />
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
