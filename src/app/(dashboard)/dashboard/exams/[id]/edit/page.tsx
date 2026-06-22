import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { getExam, getExamFormData } from "@/lib/exams/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { ExamForm } from "@/components/exams/exam-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Edit exam" };

export default async function EditExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("exam:manage");
  const [exam, formData] = await Promise.all([getExam(user, id), getExamFormData(user)]);
  if (!exam) notFound();

  const classOptions = formData.classes
    .filter((c) => c.schoolId === exam.schoolId)
    .map((c) => ({ id: c.id, label: c.name }));

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href={`/dashboard/exams/${id}`}>
          <ArrowLeft /> Back to exam
        </Link>
      </Button>
      <PageHeader title={`Edit ${exam.name}`} />
      <ExamForm
        mode="edit"
        examId={exam.id}
        classOptions={classOptions}
        defaults={{
          name: exam.name,
          type: exam.type,
          classId: exam.classId,
          maxMarks: String(exam.maxMarks),
          examDate: exam.examDate ? exam.examDate.toISOString().slice(0, 10) : undefined,
        }}
      />
    </div>
  );
}
