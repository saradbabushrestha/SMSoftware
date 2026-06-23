import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { PageHeader } from "@/components/dashboard/page-header";
import { SchoolForm } from "@/components/schools/school-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Add school" };

export default async function NewSchoolPage() {
  await requirePermission("school:manage");

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/schools">
          <ArrowLeft /> Back to schools
        </Link>
      </Button>
      <PageHeader title="Add school" description="Onboard a new institution to the platform." />
      <SchoolForm mode="create" />
    </div>
  );
}
