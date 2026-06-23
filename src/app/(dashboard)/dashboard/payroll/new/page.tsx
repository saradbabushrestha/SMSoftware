import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { getPayrollTeachers } from "@/lib/payroll/queries";
import { monthKey } from "@/lib/payroll/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { PayrollForm } from "@/components/payroll/payroll-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Run payroll" };

export default async function NewPayrollPage() {
  const user = await requirePermission("payroll:manage");
  const teachers = await getPayrollTeachers(user);

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/payroll">
          <ArrowLeft /> Back to payroll
        </Link>
      </Button>
      <PageHeader title="Run payroll" description="Generate a payslip for a staff member." />
      <PayrollForm mode="create" teachers={teachers} defaultMonth={monthKey(new Date())} />
    </div>
  );
}
