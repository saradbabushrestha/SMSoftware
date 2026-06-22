import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { getStudentFormData, nextAdmissionNumber } from "@/lib/students/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { StudentForm } from "@/components/students/student-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Add student" };

export default async function NewStudentPage() {
  const user = await requirePermission("student:create");
  const formData = await getStudentFormData(user);

  const sectionOptions = formData.classes.flatMap((c) =>
    c.sections.map((s) => ({
      id: s.id,
      label: `${formData.isSuperAdmin ? `${c.school.name} · ` : ""}${c.name} · ${s.name}`,
    })),
  );

  const suggested =
    !formData.isSuperAdmin && user.schoolId ? await nextAdmissionNumber(user.schoolId) : undefined;

  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/students">
          <ArrowLeft /> Back to students
        </Link>
      </Button>
      <PageHeader title="Add student" description="Create a student account and enroll them." />
      <StudentForm mode="create" sectionOptions={sectionOptions} suggestedAdmissionNumber={suggested} />
    </div>
  );
}
