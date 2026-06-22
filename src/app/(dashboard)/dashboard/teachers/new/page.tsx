import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { getTeacherFormData, nextEmployeeId } from "@/lib/teachers/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { TeacherForm } from "@/components/teachers/teacher-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Add teacher" };

export default async function NewTeacherPage() {
  const user = await requirePermission("teacher:manage");
  const formData = await getTeacherFormData(user);

  const subjectOptions = formData.subjects.map((s) => ({
    id: s.id,
    label: formData.isSuperAdmin ? `${s.school.name} · ${s.name}` : s.name,
  }));
  const suggested =
    !formData.isSuperAdmin && user.schoolId ? await nextEmployeeId(user.schoolId) : undefined;

  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/teachers">
          <ArrowLeft /> Back to teachers
        </Link>
      </Button>
      <PageHeader title="Add teacher" description="Create a staff account and assign subjects." />
      <TeacherForm
        mode="create"
        subjectOptions={subjectOptions}
        schools={formData.schools}
        isSuperAdmin={formData.isSuperAdmin}
        suggestedEmployeeId={suggested}
      />
    </div>
  );
}
