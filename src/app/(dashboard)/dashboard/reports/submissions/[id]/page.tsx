import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Check, X, Trash2 } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { db } from "@/lib/db";
import { getReportSubmission } from "@/lib/report-submissions/queries";
import { approveReportAction, rejectReportAction, deleteReportAction } from "@/lib/report-submissions/actions";
import { REPORT_STATUS_LABELS, REPORT_STATUS_VARIANT, fmtDateTime } from "@/lib/report-submissions/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const metadata: Metadata = { title: "Report" };

async function userName(id: string | null): Promise<string | null> {
  if (!id) return null;
  const u = await db.user.findUnique({ where: { id }, select: { firstName: true, lastName: true } });
  return u ? `${u.firstName} ${u.lastName}` : null;
}

export default async function ReportSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("report:view");
  if (user.role === "PARENT" || user.role === "STUDENT") redirect("/dashboard?denied=1");

  const r = await getReportSubmission(user, id);
  if (!r) notFound();

  const [author, reviewer] = await Promise.all([userName(r.submittedById), userName(r.reviewedById)]);
  const canApprove = can(user, "report:approve");
  const canDelete = canApprove || (r.submittedById === user.id && r.status === "SUBMITTED");
  const pending = r.status === "SUBMITTED";

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/reports/submissions">
          <ArrowLeft /> Back to submissions
        </Link>
      </Button>

      <PageHeader
        title={r.title}
        description={
          <>
            {r.category}
            {r.period ? ` · ${r.period}` : ""}
            {author ? ` · by ${author}` : ""} · {fmtDateTime(r.createdAt)}
          </>
        }
        actions={
          canDelete ? (
            <form action={deleteReportAction}>
              <input type="hidden" name="id" value={r.id} />
              <Button type="submit" variant="outline" className="text-destructive">
                <Trash2 /> Delete
              </Button>
            </form>
          ) : undefined
        }
      />

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <Badge variant={REPORT_STATUS_VARIANT[r.status]}>{REPORT_STATUS_LABELS[r.status]}</Badge>
            {r.reviewedAt ? (
              <span className="text-xs text-muted-foreground">
                {r.status === "APPROVED" ? "Approved" : "Reviewed"}
                {reviewer ? ` by ${reviewer}` : ""} · {fmtDateTime(r.reviewedAt)}
              </span>
            ) : null}
          </div>

          <p className="whitespace-pre-wrap text-sm leading-relaxed">{r.summary}</p>

          {r.reviewNote ? (
            <div className="rounded-md border bg-muted/40 px-3 py-2.5 text-sm">
              <p className="text-xs font-medium text-muted-foreground">Reviewer note</p>
              <p className="mt-0.5 whitespace-pre-wrap">{r.reviewNote}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {canApprove && pending ? (
        <Card className="mt-4">
          <CardContent className="p-6">
            <form className="space-y-3">
              <input type="hidden" name="id" value={r.id} />
              <Label htmlFor="note">Review note (optional)</Label>
              <Textarea id="note" name="note" rows={3} placeholder="Add a note for the submitter…" />
              <div className="flex items-center justify-end gap-2">
                <Button type="submit" formAction={rejectReportAction} variant="outline" className="text-destructive">
                  <X /> Reject
                </Button>
                <Button type="submit" formAction={approveReportAction}>
                  <Check /> Approve
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
