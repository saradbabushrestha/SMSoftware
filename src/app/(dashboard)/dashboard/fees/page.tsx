import type { Metadata } from "next";
import Link from "next/link";
import { Wallet, Plus, CircleDollarSign, TrendingDown, AlertTriangle } from "lucide-react";
import type { FeeCategory } from "@prisma/client";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { db } from "@/lib/db";
import { listInvoices, getInvoiceStats } from "@/lib/fees/queries";
import { FEE_CATEGORY_LABELS, displayStatus, formatNpr } from "@/lib/fees/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Pagination } from "@/components/dashboard/pagination";
import { FeesFilters } from "@/components/fees/fees-filters";
import { InvoiceRowActions } from "@/components/fees/invoice-row-actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Fees" };

function fmtDate(d: Date | null) {
  return d ? d.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "—";
}

/** Restrict invoices to the signed-in student / parent's children. */
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

export default async function FeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; category?: string; page?: string }>;
}) {
  const user = await requirePermission("fee:view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const category = sp.category && sp.category in FEE_CATEGORY_LABELS ? (sp.category as FeeCategory) : undefined;
  const studentIds = await ownStudentIds(user.role, user.id);
  const isSelfView = studentIds !== undefined;

  const [{ rows, total, totalPages, pageSize }, stats] = await Promise.all([
    listInvoices(user, { q: sp.q, status: sp.status, category, page, studentIds }),
    getInvoiceStats(user, studentIds),
  ]);

  const canManage = can(user, "fee:manage");

  return (
    <>
      <PageHeader
        title="Fees"
        description={isSelfView ? "Your invoices and balances." : "Invoices, balances and collection."}
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/dashboard/fees/new">
                <Plus /> Add invoice
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Billed" value={formatNpr(stats.billed)} icon={Wallet} />
        <StatCard label="Collected" value={formatNpr(stats.collected)} icon={CircleDollarSign} accent="success" />
        <StatCard label="Outstanding" value={formatNpr(stats.outstanding)} icon={TrendingDown} accent="warning" />
        <StatCard label="Overdue" value={stats.overdue} icon={AlertTriangle} accent="destructive" />
      </div>

      <Card className="p-4">
        <FeesFilters showSearch={!isSelfView} initialQ={sp.q} initialStatus={sp.status} initialCategory={sp.category} />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  No invoices found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((inv) => {
                const ds = displayStatus(inv.status, inv.dueDate);
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">
                      {inv.student.user.firstName} {inv.student.user.lastName}
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/fees/${inv.id}`} className="font-medium hover:underline">
                        {inv.title}
                      </Link>
                      <span className="ml-2 text-xs text-muted-foreground">{FEE_CATEGORY_LABELS[inv.category]}</span>
                    </TableCell>
                    <TableCell className="text-sm">{formatNpr(inv.amount)}</TableCell>
                    <TableCell className="text-sm">{inv.balance > 0 ? formatNpr(inv.balance) : "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmtDate(inv.dueDate)}</TableCell>
                    <TableCell>
                      <Badge variant={ds.variant}>{ds.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <InvoiceRowActions id={inv.id} title={inv.title} canManage={canManage} />
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
