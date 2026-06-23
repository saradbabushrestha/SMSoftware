import type { Metadata } from "next";
import Link from "next/link";
import { Receipt, Plus, Wallet, CircleCheck } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { listPayroll, getPayrollStats } from "@/lib/payroll/queries";
import { PAYROLL_STATUS_LABELS, PAYROLL_STATUS_VARIANT, formatMonth, formatNpr } from "@/lib/payroll/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Pagination } from "@/components/dashboard/pagination";
import { PayrollRowActions } from "@/components/payroll/payroll-row-actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Payroll" };

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requirePermission("payroll:view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const canManage = can(user, "payroll:manage");

  const [{ rows, total, totalPages, pageSize }, stats] = await Promise.all([
    listPayroll(user, { page }),
    getPayrollStats(user),
  ]);

  return (
    <>
      <PageHeader
        title="Payroll"
        description="Staff salaries and payslips."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/dashboard/payroll/new">
                <Plus /> Run payroll
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Payslips" value={stats.count.toLocaleString()} icon={Receipt} />
        <StatCard label="Total payout" value={formatNpr(stats.totalPayout)} icon={Wallet} accent="info" />
        <StatCard label="Paid out" value={formatNpr(stats.paidOut)} icon={CircleCheck} accent="success" />
      </div>

      <Card className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Teacher</TableHead>
              <TableHead>Month</TableHead>
              <TableHead>Net pay</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  No payslips yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link href={`/dashboard/payroll/${p.id}`} className="block font-medium hover:underline">
                      {p.teacher.user.firstName} {p.teacher.user.lastName}
                    </Link>
                    <span className="font-mono text-xs text-muted-foreground">{p.teacher.employeeId}</span>
                  </TableCell>
                  <TableCell className="text-sm">{formatMonth(p.month)}</TableCell>
                  <TableCell className="text-sm font-medium">{formatNpr(p.netPay)}</TableCell>
                  <TableCell>
                    <Badge variant={PAYROLL_STATUS_VARIANT[p.status]}>{PAYROLL_STATUS_LABELS[p.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <PayrollRowActions id={p.id} label={`${p.teacher.user.firstName}'s ${formatMonth(p.month)}`} canManage={canManage} />
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
