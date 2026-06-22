import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { getSubject, getSubjectFormData } from "@/lib/subjects/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { SubjectForm } from "@/components/subjects/subject-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Edit subject" };

export default async function EditSubjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission("subject:manage");
  const [subject, formData] = await Promise.all([getSubject(user, id), getSubjectFormData(user)]);
  if (!subject) notFound();

  // Scope class + teacher options to the subject's own school.
  const classOptions = formData.classes
    .filter((c) => c.schoolId === subject.schoolId)
    .map((c) => ({ id: c.id, label: c.name }));
  const teacherOptions = formData.teachers
    .filter((t) => t.schoolId === subject.schoolId)
    .map((t) => ({ id: t.id, label: `${t.user.firstName} ${t.user.lastName} · ${t.employeeId}` }));

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href={`/dashboard/subjects/${id}`}>
          <ArrowLeft /> Back to subject
        </Link>
      </Button>
      <PageHeader title={`Edit ${subject.name}`} description={`Code ${subject.code}`} />
      <SubjectForm
        mode="edit"
        subjectId={subject.id}
        classOptions={classOptions}
        teacherOptions={teacherOptions}
        schools={[]}
        isSuperAdmin={false}
        defaults={{
          name: subject.name,
          code: subject.code,
          credits: String(subject.credits),
          classId: subject.classId ?? undefined,
          teacherIds: subject.teachers.map((t) => t.id),
        }}
      />
    </div>
  );
}
