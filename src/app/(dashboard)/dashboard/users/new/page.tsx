import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { getUserSchools } from "@/lib/users/queries";
import { assignableRoles } from "@/lib/users/roles";
import { PageHeader } from "@/components/dashboard/page-header";
import { UserForm } from "@/components/users/user-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Add user" };

export default async function NewUserPage() {
  const user = await requirePermission("user:manage");
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const schools = isSuperAdmin ? await getUserSchools() : [];

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/users">
          <ArrowLeft /> Back to users
        </Link>
      </Button>
      <PageHeader title="Add user" description="Create a staff or administrator account." />
      <UserForm mode="create" assignable={assignableRoles(user.role)} isSuperAdmin={isSuperAdmin} schools={schools} />
    </div>
  );
}
