import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { getEvent } from "@/lib/events/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { EventForm } from "@/components/events/event-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Edit event" };

/** Format a Date as the local "yyyy-MM-ddTHH:mm" a datetime-local input expects. */
function toLocalInput(d: Date): string {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("event:manage");
  const event = await getEvent(user, id);
  if (!event) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href={`/dashboard/events/${id}`}>
          <ArrowLeft /> Back to event
        </Link>
      </Button>
      <PageHeader title={`Edit ${event.title}`} />
      <EventForm
        mode="edit"
        eventId={event.id}
        schools={[]}
        isSuperAdmin={false}
        defaults={{
          title: event.title,
          type: event.type,
          description: event.description ?? undefined,
          location: event.location ?? undefined,
          startsAt: toLocalInput(event.startsAt),
          endsAt: event.endsAt ? toLocalInput(event.endsAt) : undefined,
          capacity: String(event.capacity),
          registrationOpen: event.registrationOpen,
        }}
      />
    </div>
  );
}
