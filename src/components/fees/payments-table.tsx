import Link from "next/link";
import { PAYMENT_METHOD_LABELS, formatNpr } from "@/lib/fees/display";
import type { PaymentMethod } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PaymentRow {
  id: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  paidAt: Date;
  invoiceId: string;
  studentName: string;
  invoiceTitle: string;
}

export function PaymentsTable({ rows }: { rows: PaymentRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Student</TableHead>
          <TableHead>For</TableHead>
          <TableHead>Method</TableHead>
          <TableHead>Reference</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
              No payments recorded.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="text-sm text-muted-foreground">
                {p.paidAt.toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" })}
              </TableCell>
              <TableCell className="font-medium">{p.studentName}</TableCell>
              <TableCell className="text-sm">
                <Link href={`/dashboard/fees/${p.invoiceId}`} className="hover:underline">
                  {p.invoiceTitle}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{PAYMENT_METHOD_LABELS[p.method]}</Badge>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{p.reference ?? "—"}</TableCell>
              <TableCell className="text-right font-medium">{formatNpr(p.amount)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
