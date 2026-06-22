import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CircleDollarSign, Receipt } from "lucide-react";
import { requireUser, can } from "@/lib/rbac/authorize";
import { db } from "@/lib/db";
import { listPayments } from "@/lib/fees/queries";
import { formatNpr } from "@/lib/fees/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Pagination } from "@/components/dashboard/pagination";
import { PaymentsTable } from "@/components/fees/payments-table";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Payments" };

async function ownStudentIds(role: string, userId: string): Promise<string[] | undefined> {
  if (role === "PARENT") {
    const g = await db.guardian.findFirst({ where: { userId, deletedAt: null }, include: { students: { select: { studentId: true } } } });
    const ids = g?.students.map((x) => x.studentId) ?? [];
    return ids.length ? ids : ["__none__"];
  }
  return undefined;
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireUser();
  if (!can(user, "payment:manage") && !can(user, "payment:make")) redirect("/dashboard?denied=1");

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const studentIds = await ownStudentIds(user.role, user.id);

  const { rows, total, totalPages, pageSize, collected } = await listPayments(user, { page, studentIds });

  const tableRows = rows.map((p) => ({
    id: p.id,
    amount: p.amount,
    method: p.method,
    reference: p.reference,
    paidAt: p.paidAt,
    invoiceId: p.invoiceId,
    studentName: `${p.invoice.student.user.firstName} ${p.invoice.student.user.lastName}`,
    invoiceTitle: p.invoice.title,
  }));

  return (
    <>
      <PageHeader title="Payments" description={studentIds ? "Your recorded payments." : "Payment ledger across the school."} />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Total collected" value={formatNpr(collected)} icon={CircleDollarSign} accent="success" />
        <StatCard label="Payments" value={total.toLocaleString()} icon={Receipt} accent="info" />
      </div>

      <Card className="p-4">
        <PaymentsTable rows={tableRows} />
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} />
      </Card>
    </>
  );
}
