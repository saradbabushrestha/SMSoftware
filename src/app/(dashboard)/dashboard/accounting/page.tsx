import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp, TrendingDown, Scale, Plus } from "lucide-react";
import type { LedgerType } from "@prisma/client";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { listLedger, getLedgerStats } from "@/lib/accounting/queries";
import { LEDGER_TYPE_LABELS, LEDGER_TYPE_VARIANT, formatNpr, formatSigned, fmtDate } from "@/lib/accounting/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Pagination } from "@/components/dashboard/pagination";
import { LedgerFilters } from "@/components/accounting/ledger-filters";
import { LedgerRowActions } from "@/components/accounting/ledger-row-actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Accounting" };

function parseDate(v?: string): Date | undefined {
  if (!v) return undefined;
  const d = new Date(`${v}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; from?: string; to?: string; page?: string }>;
}) {
  const user = await requirePermission("accounting:view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const type = sp.type === "INCOME" || sp.type === "EXPENSE" ? (sp.type as LedgerType) : undefined;
  const from = parseDate(sp.from);
  const to = parseDate(sp.to);
  const canManage = can(user, "accounting:manage");

  const [{ rows, total, totalPages, pageSize }, stats] = await Promise.all([
    listLedger(user, { type, from, to, page }),
    getLedgerStats(user, { from, to }),
  ]);

  return (
    <>
      <PageHeader
        title="Accounting"
        description="Income, expenses and the running profit & loss."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/dashboard/accounting/new">
                <Plus /> Add entry
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Income" value={formatNpr(stats.income)} icon={TrendingUp} accent="success" />
        <StatCard label="Expenses" value={formatNpr(stats.expense)} icon={TrendingDown} accent="destructive" />
        <StatCard
          label="Net (P&L)"
          value={formatNpr(stats.net)}
          icon={Scale}
          accent={stats.net >= 0 ? "success" : "warning"}
        />
      </div>

      <LedgerFilters initialType={sp.type} initialFrom={sp.from} initialTo={sp.to} />

      <Card className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 5 : 4} className="py-12 text-center text-sm text-muted-foreground">
                  No ledger entries for this filter.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm whitespace-nowrap">{fmtDate(e.date)}</TableCell>
                  <TableCell>
                    <span className="font-medium">{e.category}</span>
                    {e.description ? (
                      <span className="block text-xs text-muted-foreground">{e.description}</span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant={LEDGER_TYPE_VARIANT[e.type]}>{LEDGER_TYPE_LABELS[e.type]}</Badge>
                  </TableCell>
                  <TableCell
                    className={`text-right text-sm font-medium ${e.type === "INCOME" ? "text-success" : "text-destructive"}`}
                  >
                    {formatSigned(e.type, e.amount)}
                  </TableCell>
                  {canManage ? (
                    <TableCell className="text-right">
                      <LedgerRowActions id={e.id} label={`${e.category} · ${fmtDate(e.date)}`} />
                    </TableCell>
                  ) : null}
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
