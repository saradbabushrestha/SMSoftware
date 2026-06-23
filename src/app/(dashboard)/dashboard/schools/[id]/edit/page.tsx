import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { getSchool } from "@/lib/schools/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { SchoolForm } from "@/components/schools/school-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Edit school" };

export default async function EditSchoolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Super admin edits any school; school admin may edit only their own.
  const user = await requirePermission("school:view");
  const school = await getSchool(user, id);
  if (!school) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href={`/dashboard/schools/${id}`}>
          <ArrowLeft /> Back to school
        </Link>
      </Button>
      <PageHeader title={`Edit ${school.name}`} />
      <SchoolForm
        mode="edit"
        schoolId={school.id}
        defaults={{
          name: school.name,
          code: school.code,
          email: school.email ?? undefined,
          phone: school.phone ?? undefined,
          address: school.address ?? undefined,
          city: school.city ?? undefined,
          country: school.country ?? undefined,
          timezone: school.timezone,
        }}
      />
    </div>
  );
}
