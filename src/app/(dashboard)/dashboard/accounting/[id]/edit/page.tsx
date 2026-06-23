import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { getLedgerEntry } from "@/lib/accounting/queries";
import { dateInputValue } from "@/lib/accounting/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { LedgerForm } from "@/components/accounting/ledger-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Edit ledger entry" };

export default async function EditLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("accounting:manage");
  const entry = await getLedgerEntry(user, id);
  if (!entry) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/accounting">
          <ArrowLeft /> Back to accounting
        </Link>
      </Button>
      <PageHeader title="Edit ledger entry" description={`${entry.category} · ${dateInputValue(entry.date)}`} />
      <LedgerForm
        mode="edit"
        entryId={entry.id}
        defaults={{
          type: entry.type,
          category: entry.category,
          amount: String(entry.amount),
          date: dateInputValue(entry.date),
          description: entry.description ?? undefined,
        }}
      />
    </div>
  );
}
