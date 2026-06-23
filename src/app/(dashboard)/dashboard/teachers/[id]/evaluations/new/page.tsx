import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { getEvaluableTeacher } from "@/lib/evaluations/queries";
import { fullName } from "@/lib/teachers/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { EvaluationForm } from "@/components/evaluations/evaluation-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "New evaluation" };

export default async function NewEvaluationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("teacher:evaluate");
  const teacher = await getEvaluableTeacher(user, id);
  if (!teacher) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href={`/dashboard/teachers/${id}`}>
          <ArrowLeft /> Back to profile
        </Link>
      </Button>
      <PageHeader title="New evaluation" description={`Performance review for ${fullName(teacher.user.firstName, teacher.user.lastName)}`} />
      <EvaluationForm teacherId={teacher.id} />
    </div>
  );
}
