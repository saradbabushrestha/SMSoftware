import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { getAssignmentFormData } from "@/lib/assignments/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { AssignmentForm } from "@/components/assignments/assignment-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Add assignment" };

export default async function NewAssignmentPage() {
  const user = await requirePermission("assignment:manage");
  const { sections, subjects } = await getAssignmentFormData(user);

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/assignments">
          <ArrowLeft /> Back to assignments
        </Link>
      </Button>
      <PageHeader title="Add assignment" description="Assign work to a class section." />
      <AssignmentForm mode="create" sections={sections} subjects={subjects} />
    </div>
  );
}
