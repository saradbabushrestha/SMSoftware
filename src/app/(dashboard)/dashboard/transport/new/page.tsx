import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/page-header";
import { RouteForm } from "@/components/transport/route-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Add route" };

export default async function NewRoutePage() {
  const user = await requirePermission("transport:manage");
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const schools = isSuperAdmin
    ? await db.school.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } })
    : [];

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/transport">
          <ArrowLeft /> Back to transport
        </Link>
      </Button>
      <PageHeader title="Add route" description="Create a bus route and assign students from its page." />
      <RouteForm mode="create" schools={schools} isSuperAdmin={isSuperAdmin} />
    </div>
  );
}
