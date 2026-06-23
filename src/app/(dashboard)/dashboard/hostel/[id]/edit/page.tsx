import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { getRoom } from "@/lib/hostel/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { RoomForm } from "@/components/hostel/room-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Edit room" };

export default async function EditRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("hostel:manage");
  const room = await getRoom(user, id);
  if (!room) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href={`/dashboard/hostel/${id}`}>
          <ArrowLeft /> Back to room
        </Link>
      </Button>
      <PageHeader title={`Edit ${room.block} · ${room.number}`} />
      <RoomForm
        mode="edit"
        roomId={room.id}
        schools={[]}
        isSuperAdmin={false}
        defaults={{
          block: room.block,
          number: room.number,
          gender: room.gender,
          capacity: String(room.capacity),
          wardenName: room.wardenName ?? undefined,
          notes: room.notes ?? undefined,
        }}
      />
    </div>
  );
}
