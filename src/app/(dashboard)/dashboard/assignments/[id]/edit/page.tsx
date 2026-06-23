import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { getAssignment, getAssignmentFormData } from "@/lib/assignments/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { AssignmentForm } from "@/components/assignments/assignment-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Edit assignment" };

function toLocalInput(d: Date): string {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

export default async function EditAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("assignment:manage");
  const [assignment, formData] = await Promise.all([getAssignment(user, id), getAssignmentFormData(user)]);
  if (!assignment) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href={`/dashboard/assignments/${id}`}>
          <ArrowLeft /> Back to assignment
        </Link>
      </Button>
      <PageHeader title={`Edit ${assignment.title}`} />
      <AssignmentForm
        mode="edit"
        assignmentId={assignment.id}
        sections={formData.sections}
        subjects={formData.subjects}
        defaults={{
          sectionId: assignment.sectionId,
          subjectId: assignment.subjectId,
          title: assignment.title,
          description: assignment.description ?? undefined,
          dueDate: toLocalInput(assignment.dueDate),
          maxPoints: String(assignment.maxPoints),
        }}
      />
    </div>
  );
}
