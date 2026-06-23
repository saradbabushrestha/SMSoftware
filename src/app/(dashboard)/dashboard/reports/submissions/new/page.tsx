import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { PageHeader } from "@/components/dashboard/page-header";
import { SubmissionForm } from "@/components/report-submissions/submission-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Submit report" };

export default async function NewReportSubmissionPage() {
  const user = await requirePermission("report:view");
  if (user.role === "PARENT" || user.role === "STUDENT") redirect("/dashboard?denied=1");

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/reports/submissions">
          <ArrowLeft /> Back to submissions
        </Link>
      </Button>
      <PageHeader title="Submit report" description="Send a report to your principal for approval." />
      <SubmissionForm />
    </div>
  );
}
