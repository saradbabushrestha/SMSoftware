import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { getManagedUser, getUserSchools } from "@/lib/users/queries";
import { assignableRoles, hasProfile } from "@/lib/users/roles";
import { PageHeader } from "@/components/dashboard/page-header";
import { UserForm } from "@/components/users/user-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Edit user" };

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("user:manage");
  const target = await getManagedUser(user, id);
  if (!target) notFound();

  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const roleEditable = can(user, "role:manage") && !hasProfile(target.role) && target.id !== user.id;
  const schools = isSuperAdmin ? await getUserSchools() : [];

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href={`/dashboard/users/${id}`}>
          <ArrowLeft /> Back to user
        </Link>
      </Button>
      <PageHeader title={`Edit ${target.firstName} ${target.lastName}`} description={target.email} />
      <UserForm
        mode="edit"
        userId={target.id}
        assignable={assignableRoles(user.role)}
        isSuperAdmin={isSuperAdmin}
        schools={schools}
        roleEditable={roleEditable}
        lockedRole={target.role}
        defaults={{
          firstName: target.firstName,
          lastName: target.lastName,
          phone: target.phone ?? undefined,
          role: target.role,
          status: target.status,
        }}
      />
    </div>
  );
}
