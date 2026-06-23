import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { dateInputValue } from "@/lib/accounting/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { LedgerForm } from "@/components/accounting/ledger-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Add ledger entry" };

export default async function NewLedgerPage() {
  await requirePermission("accounting:manage");

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/accounting">
          <ArrowLeft /> Back to accounting
        </Link>
      </Button>
      <PageHeader title="Add ledger entry" description="Record an income or expense." />
      <LedgerForm mode="create" defaultDate={dateInputValue(new Date())} />
    </div>
  );
}
