import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { getPayroll, getPayrollTeachers } from "@/lib/payroll/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { PayrollForm } from "@/components/payroll/payroll-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Edit payslip" };

export default async function EditPayslipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("payroll:manage");
  const [rec, teachers] = await Promise.all([getPayroll(user, id), getPayrollTeachers(user)]);
  if (!rec) notFound();
  if (rec.status === "PAID") redirect(`/dashboard/payroll/${id}`);

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href={`/dashboard/payroll/${id}`}>
          <ArrowLeft /> Back to payslip
        </Link>
      </Button>
      <PageHeader title="Edit payslip" description={`${rec.teacher.user.firstName} ${rec.teacher.user.lastName}`} />
      <PayrollForm
        mode="edit"
        payrollId={rec.id}
        teachers={teachers}
        defaults={{
          teacherId: rec.teacherId,
          month: rec.month,
          basicSalary: String(rec.basicSalary),
          allowances: String(rec.allowances),
          deductions: String(rec.deductions),
          tax: String(rec.tax),
          note: rec.note ?? undefined,
        }}
      />
    </div>
  );
}
