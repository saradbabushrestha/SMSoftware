import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileSpreadsheet, Download, ClipboardCheck, ChevronRight } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { REPORTS } from "@/lib/reports/registry";
import { pendingReportCount } from "@/lib/report-submissions/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const user = await requirePermission("report:view");
  // Bulk exports are a staff tool — not for parents.
  if (user.role === "PARENT") redirect("/dashboard?denied=1");

  const available = REPORTS.filter((r) => can(user, r.permission));
  const canApprove = can(user, "report:approve");
  const pending = canApprove ? await pendingReportCount(user) : 0;

  return (
    <>
      <PageHeader title="Reports" description="Export platform data as CSV." />

      <Link href="/dashboard/reports/submissions" className="mb-4 block">
        <Card className="transition-colors hover:border-primary/40">
          <CardContent className="flex items-center gap-4 p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <ClipboardCheck className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Report submissions &amp; approvals</p>
              <p className="text-sm text-muted-foreground">
                {canApprove ? "Review reports submitted by staff." : "Submit reports for principal approval."}
              </p>
            </div>
            {pending > 0 ? <Badge variant="warning">{pending} pending</Badge> : null}
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>

      {available.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No reports are available for your role.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {available.map((r) => (
            <Card key={r.key}>
              <CardContent className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <FileSpreadsheet className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold">{r.label}</h3>
                    <p className="text-sm text-muted-foreground">{r.description}</p>
                  </div>
                </div>
                <div className="mt-auto">
                  <Button asChild variant="outline" className="w-full">
                    <a href={`/api/reports/${r.key}`} download>
                      <Download /> Download CSV
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
