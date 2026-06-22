import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { getExamFormData } from "@/lib/exams/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { ExamForm } from "@/components/exams/exam-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Add exam" };

export default async function NewExamPage() {
  const user = await requirePermission("exam:manage");
  const formData = await getExamFormData(user);
  const classOptions = formData.classes.map((c) => ({
    id: c.id,
    label: formData.isSuperAdmin ? `${c.school.name} · ${c.name}` : c.name,
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/exams">
          <ArrowLeft /> Back to exams
        </Link>
      </Button>
      <PageHeader title="Add exam" description="Create an exam, then enter grades from its page." />
      <ExamForm mode="create" classOptions={classOptions} />
    </div>
  );
}
