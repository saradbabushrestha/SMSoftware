import type { Metadata } from "next";
import Link from "next/link";
import { NotebookPen, Plus, CheckCircle2, FileClock } from "lucide-react";
import type { ExamType } from "@prisma/client";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { listExams, getExamStats, getExamFormData } from "@/lib/exams/queries";
import { EXAM_TYPE_LABELS, EXAM_TYPE_VARIANT } from "@/lib/exams/grading";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Pagination } from "@/components/dashboard/pagination";
import { ExamsFilters } from "@/components/exams/exams-filters";
import { ExamRowActions } from "@/components/exams/exam-row-actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Exams" };

function fmtDate(d: Date | null) {
  return d ? d.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "—";
}

export default async function ExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; classId?: string; type?: string; page?: string }>;
}) {
  const user = await requirePermission("exam:view");
  const sp = await searchParams;
  const type = sp.type && sp.type in EXAM_TYPE_LABELS ? (sp.type as ExamType) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ rows, total, totalPages, pageSize }, stats, formData] = await Promise.all([
    listExams(user, { q: sp.q, classId: sp.classId, type, page }),
    getExamStats(user),
    getExamFormData(user),
  ]);

  const canManage = can(user, "exam:manage");
  const classOptions = formData.classes.map((c) => ({
    id: c.id,
    label: formData.isSuperAdmin ? `${c.school.name} · ${c.name}` : c.name,
  }));

  return (
    <>
      <PageHeader
        title="Exams"
        description="Examination schedule, grading and publishing."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/dashboard/exams/new">
                <Plus /> Add exam
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total exams" value={stats.total.toLocaleString()} icon={NotebookPen} />
        <StatCard label="Published" value={stats.published.toLocaleString()} icon={CheckCircle2} accent="success" />
        <StatCard label="Draft" value={stats.draft.toLocaleString()} icon={FileClock} accent="warning" />
      </div>

      <Card className="p-4">
        <ExamsFilters classes={classOptions} initialQ={sp.q} initialClassId={sp.classId} initialType={sp.type} />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Exam</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Results</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  No exams found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <Link href={`/dashboard/exams/${e.id}`} className="font-medium hover:underline">
                      {e.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={EXAM_TYPE_VARIANT[e.type]}>{EXAM_TYPE_LABELS[e.type]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{e.class.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmtDate(e.examDate)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e._count.results}</TableCell>
                  <TableCell>
                    <Badge variant={e.published ? "success" : "secondary"}>{e.published ? "Published" : "Draft"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <ExamRowActions id={e.id} name={e.name} canManage={canManage} />
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
