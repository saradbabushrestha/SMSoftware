import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/page-header";
import { ClassForm } from "@/components/classes/class-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Add class" };

export default async function NewClassPage() {
  const user = await requirePermission("class:manage");
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const schools = isSuperAdmin
    ? await db.school.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } })
    : [];

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/classes">
          <ArrowLeft /> Back to classes
        </Link>
      </Button>
      <PageHeader title="Add class" description="Create a class; add sections from its profile." />
      <ClassForm mode="create" schools={schools} isSuperAdmin={isSuperAdmin} />
    </div>
  );
}
