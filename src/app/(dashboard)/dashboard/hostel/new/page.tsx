import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/page-header";
import { RoomForm } from "@/components/hostel/room-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Add room" };

export default async function NewRoomPage() {
  const user = await requirePermission("hostel:manage");
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const schools = isSuperAdmin
    ? await db.school.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } })
    : [];

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/hostel">
          <ArrowLeft /> Back to hostel
        </Link>
      </Button>
      <PageHeader title="Add room" description="Create a hostel room and assign students from its page." />
      <RoomForm mode="create" schools={schools} isSuperAdmin={isSuperAdmin} />
    </div>
  );
}
