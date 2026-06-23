import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Plus, FileText } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { listReportSubmissions } from "@/lib/report-submissions/queries";
import { REPORT_STATUS_LABELS, REPORT_STATUS_VARIANT, fmtDate } from "@/lib/report-submissions/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { Pagination } from "@/components/dashboard/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Report submissions" };

export default async function ReportSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requirePermission("report:view");
  if (user.role === "PARENT" || user.role === "STUDENT") redirect("/dashboard?denied=1");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const { rows, total, totalPages, pageSize } = await listReportSubmissions(user, { page });

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/reports">
          <ArrowLeft /> Back to reports
        </Link>
      </Button>

      <PageHeader
        title="Report submissions"
        description={can(user, "report:approve") ? "Review and approve reports submitted by staff." : "Reports submitted for principal approval."}
        actions={
          <Button asChild>
            <Link href="/dashboard/reports/submissions/new">
              <Plus /> Submit report
            </Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <FileText className="size-6" />
            </span>
            <h2 className="text-lg font-semibold tracking-tight">No reports submitted yet</h2>
            <p className="max-w-sm text-sm text-muted-foreground">Submit a report to send it for principal approval.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <Link href={`/dashboard/reports/submissions/${r.id}`} className="min-w-0">
                  <p className="truncate font-medium hover:underline">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.category}
                    {r.period ? ` · ${r.period}` : ""} · {fmtDate(r.createdAt)}
                  </p>
                </Link>
                <Badge variant={REPORT_STATUS_VARIANT[r.status]}>{REPORT_STATUS_LABELS[r.status]}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} />
      </div>
    </>
  );
}
