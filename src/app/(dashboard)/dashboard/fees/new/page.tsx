import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { getInvoiceFormData } from "@/lib/fees/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { InvoiceForm } from "@/components/fees/invoice-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Add invoice" };

export default async function NewInvoicePage() {
  const user = await requirePermission("fee:manage");
  const { students } = await getInvoiceFormData(user);

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/fees">
          <ArrowLeft /> Back to fees
        </Link>
      </Button>
      <PageHeader title="Add invoice" description="Bill a student for a fee." />
      <InvoiceForm mode="create" studentOptions={students} />
    </div>
  );
}
