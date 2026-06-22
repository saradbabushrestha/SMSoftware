import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { getSubjectFormData } from "@/lib/subjects/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { SubjectForm } from "@/components/subjects/subject-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Add subject" };

export default async function NewSubjectPage() {
  const user = await requirePermission("subject:manage");
  const formData = await getSubjectFormData(user);

  const classOptions = formData.classes.map((c) => ({
    id: c.id,
    label: formData.isSuperAdmin ? `${c.school.name} · ${c.name}` : c.name,
  }));
  const teacherOptions = formData.teachers.map((t) => ({
    id: t.id,
    label: `${t.user.firstName} ${t.user.lastName} · ${t.employeeId}`,
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/subjects">
          <ArrowLeft /> Back to subjects
        </Link>
      </Button>
      <PageHeader title="Add subject" description="Create a subject and assign teachers." />
      <SubjectForm
        mode="create"
        classOptions={classOptions}
        teacherOptions={teacherOptions}
        schools={formData.schools}
        isSuperAdmin={formData.isSuperAdmin}
      />
    </div>
  );
}
