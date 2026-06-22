import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Receipt } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { db } from "@/lib/db";
import { getInvoice } from "@/lib/fees/queries";
import { FEE_CATEGORY_LABELS, PAYMENT_METHOD_LABELS, displayStatus, formatNpr } from "@/lib/fees/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { Panel, EmptyState, ProgressBar } from "@/components/dashboard/widgets";
import { RecordPaymentDialog } from "@/components/fees/record-payment-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Invoice" };

function fmtDate(d: Date | null) {
  return d ? d.toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : "—";
}

async function ownStudentIds(role: string, userId: string): Promise<string[] | undefined> {
  if (role === "STUDENT") {
    const s = await db.student.findFirst({ where: { userId, deletedAt: null }, select: { id: true } });
    return [s?.id ?? "__none__"];
  }
  if (role === "PARENT") {
    const g = await db.guardian.findFirst({ where: { userId, deletedAt: null }, include: { students: { select: { studentId: true } } } });
    const ids = g?.students.map((x) => x.studentId) ?? [];
    return ids.length ? ids : ["__none__"];
  }
  return undefined;
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("fee:view");
  const studentIds = await ownStudentIds(user.role, user.id);
  const invoice = await getInvoice(user, id, studentIds);
  if (!invoice) notFound();

  const ds = displayStatus(invoice.status, invoice.dueDate);
  const canFeeManage = can(user, "fee:manage");
  const canManagePay = can(user, "payment:manage");
  const canMakePay = can(user, "payment:make");
  const showPay = invoice.balance > 0 && invoice.status !== "CANCELLED" && (canManagePay || canMakePay);
  const pctPaid = invoice.amount > 0 ? Math.round((invoice.paid / invoice.amount) * 100) : 0;

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/fees">
          <ArrowLeft /> Back to fees
        </Link>
      </Button>

      <PageHeader
        title={invoice.title}
        description={
          <>
            {invoice.student.user.firstName} {invoice.student.user.lastName} · {invoice.student.admissionNumber}
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            {showPay ? <RecordPaymentDialog invoiceId={invoice.id} balance={invoice.balance} canManage={canManagePay} /> : null}
            {canFeeManage ? (
              <Button asChild variant="outline">
                <Link href={`/dashboard/fees/${invoice.id}/edit`}>
                  <Pencil /> Edit
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{FEE_CATEGORY_LABELS[invoice.category]}</Badge>
              <Badge variant={ds.variant}>{ds.label}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="text-2xl font-semibold tracking-tight">{formatNpr(invoice.amount)}</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-medium">{formatNpr(invoice.paid)}</span>
              </div>
              <ProgressBar value={pctPaid} tone={pctPaid >= 100 ? "success" : "primary"} />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Balance</span>
                <span className="font-medium">{formatNpr(invoice.balance)}</span>
              </div>
            </div>
            <div className="space-y-1 border-t pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due date</span>
                <span className="font-medium">{fmtDate(invoice.dueDate)}</span>
              </div>
              {invoice.note ? <p className="pt-1 text-xs text-muted-foreground">{invoice.note}</p> : null}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Panel title="Payments" description="Recorded payments against this invoice" action={<Receipt className="size-4 text-muted-foreground" />}>
            {invoice.payments.length === 0 ? (
              <EmptyState title="No payments yet" description={showPay ? "Record or make a payment to get started." : undefined} />
            ) : (
              <ul className="divide-y">
                {invoice.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{formatNpr(p.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.paidAt.toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" })}
                        {p.reference ? ` · ${p.reference}` : ""}
                        {p.recordedBy ? ` · by ${p.recordedBy.firstName} ${p.recordedBy.lastName}` : ""}
                      </p>
                    </div>
                    <Badge variant="secondary">{PAYMENT_METHOD_LABELS[p.method]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
