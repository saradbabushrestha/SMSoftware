import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { getStudent, getStudentFormData } from "@/lib/students/queries";
import { fullName } from "@/lib/students/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { StudentForm } from "@/components/students/student-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Edit student" };

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission("student:update");
  const [student, formData] = await Promise.all([getStudent(user, id), getStudentFormData(user)]);
  if (!student) notFound();

  const sectionOptions = formData.classes.flatMap((c) =>
    c.sections.map((s) => ({
      id: s.id,
      label: `${formData.isSuperAdmin ? `${c.school.name} · ` : ""}${c.name} · ${s.name}`,
    })),
  );

  const currentSectionId = student.enrollments[0]?.sectionId;

  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href={`/dashboard/students/${id}`}>
          <ArrowLeft /> Back to profile
        </Link>
      </Button>
      <PageHeader
        title={`Edit ${fullName(student.user.firstName, student.user.lastName)}`}
        description={`Admission no. ${student.admissionNumber}`}
      />
      <StudentForm
        mode="edit"
        studentId={student.id}
        sectionOptions={sectionOptions}
        defaults={{
          firstName: student.user.firstName,
          lastName: student.user.lastName,
          email: student.user.email,
          phone: student.user.phone ?? undefined,
          gender: student.gender,
          dateOfBirth: student.dateOfBirth
            ? student.dateOfBirth.toISOString().slice(0, 10)
            : undefined,
          bloodGroup: student.bloodGroup,
          nationality: student.nationality ?? undefined,
          address: student.address ?? undefined,
          admissionNumber: student.admissionNumber,
          rollNumber: student.rollNumber ?? undefined,
          sectionId: currentSectionId,
          status: student.status,
        }}
      />
    </div>
  );
}
