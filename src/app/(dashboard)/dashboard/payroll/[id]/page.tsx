import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, CircleCheck, Trash2 } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { getPayroll } from "@/lib/payroll/queries";
import { markPaidAction, deletePayrollAction } from "@/lib/payroll/actions";
import { PAYROLL_STATUS_LABELS, PAYROLL_STATUS_VARIANT, formatMonth, formatNpr } from "@/lib/payroll/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Payslip" };

function fmtDate(d: Date | null) {
  return d ? d.toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : "—";
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 text-sm ${strong ? "font-semibold" : ""}`}>
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default async function PayslipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("payroll:view");
  const rec = await getPayroll(user, id);
  if (!rec) notFound();

  const canManage = can(user, "payroll:manage");
  const isDraft = rec.status === "DRAFT";

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/payroll">
          <ArrowLeft /> Back to payroll
        </Link>
      </Button>

      <PageHeader
        title={`${rec.teacher.user.firstName} ${rec.teacher.user.lastName}`}
        description={
          <>
            {rec.teacher.employeeId} · {formatMonth(rec.month)}
          </>
        }
        actions={
          canManage ? (
            <div className="flex items-center gap-2">
              {isDraft ? (
                <>
                  <form action={markPaidAction}>
                    <input type="hidden" name="id" value={rec.id} />
                    <Button type="submit">
                      <CircleCheck /> Mark paid
                    </Button>
                  </form>
                  <Button asChild variant="outline">
                    <Link href={`/dashboard/payroll/${rec.id}/edit`}>
                      <Pencil /> Edit
                    </Link>
                  </Button>
                </>
              ) : null}
              <form action={deletePayrollAction}>
                <input type="hidden" name="id" value={rec.id} />
                <Button type="submit" variant="outline" className="text-destructive">
                  <Trash2 /> Delete
                </Button>
              </form>
            </div>
          ) : undefined
        }
      />

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{rec.school.name}</p>
              <p className="text-sm font-medium">Payslip · {formatMonth(rec.month)}</p>
            </div>
            <Badge variant={PAYROLL_STATUS_VARIANT[rec.status]}>{PAYROLL_STATUS_LABELS[rec.status]}</Badge>
          </div>

          <div className="divide-y border-t">
            <Line label="Basic salary" value={formatNpr(rec.basicSalary)} />
            <Line label="Allowances" value={`+ ${formatNpr(rec.allowances)}`} />
            <Line label="Deductions" value={`− ${formatNpr(rec.deductions)}`} />
            <Line label="Tax" value={`− ${formatNpr(rec.tax)}`} />
            <Line label="Net pay" value={formatNpr(rec.netPay)} strong />
          </div>

          <div className="mt-4 space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid on</span>
              <span className="font-medium">{fmtDate(rec.paidAt)}</span>
            </div>
            {rec.note ? <p className="pt-1 text-xs text-muted-foreground">{rec.note}</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
