import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/page-header";
import { GuardianForm } from "@/components/guardians/guardian-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Add guardian" };

export default async function NewGuardianPage() {
  const user = await requirePermission("guardian:manage");
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const schools = isSuperAdmin
    ? await db.school.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } })
    : [];

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/guardians">
          <ArrowLeft /> Back to guardians
        </Link>
      </Button>
      <PageHeader title="Add guardian" description="Create a guardian account; link children from their profile." />
      <GuardianForm mode="create" schools={schools} isSuperAdmin={isSuperAdmin} />
    </div>
  );
}
