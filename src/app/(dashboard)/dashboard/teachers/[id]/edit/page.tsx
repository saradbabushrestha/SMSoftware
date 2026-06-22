import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { getTeacher, getTeacherFormData } from "@/lib/teachers/queries";
import { fullName } from "@/lib/teachers/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { TeacherForm } from "@/components/teachers/teacher-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Edit teacher" };

export default async function EditTeacherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission("teacher:manage");
  const [teacher, formData] = await Promise.all([getTeacher(user, id), getTeacherFormData(user)]);
  if (!teacher) notFound();

  // Edit always scopes subjects to the teacher's own school.
  const subjectOptions = formData.subjects
    .filter((s) => s.schoolId === teacher.schoolId)
    .map((s) => ({ id: s.id, label: s.name }));

  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href={`/dashboard/teachers/${id}`}>
          <ArrowLeft /> Back to profile
        </Link>
      </Button>
      <PageHeader
        title={`Edit ${fullName(teacher.user.firstName, teacher.user.lastName)}`}
        description={`Employee ID ${teacher.employeeId}`}
      />
      <TeacherForm
        mode="edit"
        teacherId={teacher.id}
        subjectOptions={subjectOptions}
        schools={formData.schools}
        isSuperAdmin={formData.isSuperAdmin}
        defaults={{
          firstName: teacher.user.firstName,
          lastName: teacher.user.lastName,
          email: teacher.user.email,
          phone: teacher.user.phone ?? undefined,
          employeeId: teacher.employeeId,
          qualification: teacher.qualification ?? undefined,
          experienceYrs: String(teacher.experienceYrs),
          joinedOn: teacher.joinedOn ? teacher.joinedOn.toISOString().slice(0, 10) : undefined,
          status: teacher.user.status,
          subjectIds: teacher.subjects.map((s) => s.id),
        }}
      />
    </div>
  );
}
