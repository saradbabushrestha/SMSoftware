import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { getInvoice } from "@/lib/fees/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { InvoiceForm } from "@/components/fees/invoice-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Edit invoice" };

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("fee:manage");
  const invoice = await getInvoice(user, id);
  if (!invoice) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href={`/dashboard/fees/${id}`}>
          <ArrowLeft /> Back to invoice
        </Link>
      </Button>
      <PageHeader title="Edit invoice" />
      <InvoiceForm
        mode="edit"
        invoiceId={invoice.id}
        studentOptions={[]}
        lockedStudentLabel={`${invoice.student.user.firstName} ${invoice.student.user.lastName} · ${invoice.student.admissionNumber}`}
        defaults={{
          studentId: invoice.studentId,
          category: invoice.category,
          title: invoice.title,
          amount: String(invoice.amount),
          dueDate: invoice.dueDate ? invoice.dueDate.toISOString().slice(0, 10) : undefined,
          note: invoice.note ?? undefined,
        }}
      />
    </div>
  );
}
