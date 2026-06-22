import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { getGuardian } from "@/lib/guardians/queries";
import { fullName } from "@/lib/guardians/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { GuardianForm } from "@/components/guardians/guardian-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Edit guardian" };

export default async function EditGuardianPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission("guardian:manage");
  const guardian = await getGuardian(user, id);
  if (!guardian) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href={`/dashboard/guardians/${id}`}>
          <ArrowLeft /> Back to profile
        </Link>
      </Button>
      <PageHeader title={`Edit ${fullName(guardian.user.firstName, guardian.user.lastName)}`} />
      <GuardianForm
        mode="edit"
        guardianId={guardian.id}
        schools={[]}
        isSuperAdmin={false}
        defaults={{
          firstName: guardian.user.firstName,
          lastName: guardian.user.lastName,
          email: guardian.user.email,
          phone: guardian.user.phone ?? undefined,
          occupation: guardian.occupation ?? undefined,
          address: guardian.address ?? undefined,
          status: guardian.user.status,
        }}
      />
    </div>
  );
}
