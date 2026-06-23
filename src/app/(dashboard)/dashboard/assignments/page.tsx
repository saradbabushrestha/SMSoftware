import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Plus, CalendarClock, Inbox } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { listAssignments, listStudentAssignments, getAssignmentStats } from "@/lib/assignments/queries";
import { studentAssignmentState, formatDue, isOverdue } from "@/lib/assignments/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Pagination } from "@/components/dashboard/pagination";
import { AssignmentRowActions } from "@/components/assignments/assignment-row-actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Assignments" };

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requirePermission("assignment:view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  // ─── Student view ───
  if (user.role === "STUDENT") {
    const { rows, total, totalPages, pageSize } = await listStudentAssignments(user, page);
    return (
      <>
        <PageHeader title="Assignments" description="Your assignments and submissions." />
        <Card className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assignment</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                    No assignments yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((a) => {
                  const st = studentAssignmentState(a.submissions[0] ?? null, a.dueDate);
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        <Link href={`/dashboard/assignments/${a.id}`} className="font-medium hover:underline">
                          {a.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.subject.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDue(a.dueDate)}</TableCell>
                      <TableCell>
                        <Badge variant={st.variant}>{st.label}</Badge>
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

  // ─── Teacher / admin view ───
  const [{ rows, total, totalPages, pageSize }, stats] = await Promise.all([
    listAssignments(user, { page }),
    getAssignmentStats(user),
  ]);
  const canManage = can(user, "assignment:manage");

  return (
    <>
      <PageHeader
        title="Assignments"
        description="Create assignments and grade submissions."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/dashboard/assignments/new">
                <Plus /> Add assignment
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total assignments" value={stats.total.toLocaleString()} icon={ClipboardList} />
        <StatCard label="Upcoming due" value={stats.upcoming.toLocaleString()} icon={CalendarClock} accent="info" />
        <StatCard label="Awaiting grading" value={stats.ungraded.toLocaleString()} icon={Inbox} accent="warning" />
      </div>

      <Card className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Assignment</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Class · Section</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Submissions</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  No assignments found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Link href={`/dashboard/assignments/${a.id}`} className="font-medium hover:underline">
                      {a.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.subject.code}</TableCell>
                  <TableCell className="text-sm">{a.section.class.name} · {a.section.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDue(a.dueDate)}
                    {isOverdue(a.dueDate) ? <Badge variant="secondary" className="ml-2">closed</Badge> : null}
                  </TableCell>
                  <TableCell className="text-sm">{a._count.submissions}</TableCell>
                  <TableCell className="text-right">
                    <AssignmentRowActions id={a.id} title={a.title} canManage={canManage} />
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
