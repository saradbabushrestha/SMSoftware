import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, CalendarClock, MapPin, Users, Ticket, Check } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { getEvent, getEventAttendees } from "@/lib/events/queries";
import { registerEventAction, unregisterEventAction } from "@/lib/events/actions";
import { EVENT_TYPE_LABELS, EVENT_TYPE_VARIANT, formatEventWhen, isPast, capacityLabel, isFull } from "@/lib/events/display";
import { ROLE_LABELS } from "@/lib/rbac/permissions";
import { PageHeader } from "@/components/dashboard/page-header";
import { Panel, EmptyState } from "@/components/dashboard/widgets";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Event" };

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("event:view");
  const event = await getEvent(user, id);
  if (!event) notFound();

  const canManage = can(user, "event:manage");
  const past = isPast(event.startsAt);
  const full = isFull(event.registeredCount, event.capacity);
  const canRegister = !past && event.registrationOpen && !event.isRegistered && !full;
  const attendees = canManage ? await getEventAttendees(event.id) : [];

  const meta = [
    { icon: CalendarClock, label: "When", value: formatEventWhen(event.startsAt, event.endsAt) },
    { icon: MapPin, label: "Location", value: event.location ?? "—" },
    { icon: Users, label: "Registered", value: capacityLabel(event.registeredCount, event.capacity) + (event.capacity > 0 ? " spots" : " attendees") },
  ];

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/events">
          <ArrowLeft /> Back to events
        </Link>
      </Button>

      <PageHeader
        title={event.title}
        description={
          <span className="inline-flex items-center gap-2">
            <Badge variant={EVENT_TYPE_VARIANT[event.type]}>{EVENT_TYPE_LABELS[event.type]}</Badge>
            <Badge variant={past ? "secondary" : "success"}>{past ? "Past" : "Upcoming"}</Badge>
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            {event.isRegistered ? (
              <form action={unregisterEventAction}>
                <input type="hidden" name="eventId" value={event.id} />
                <Button type="submit" variant="outline" disabled={past}>
                  <Check /> Registered — cancel
                </Button>
              </form>
            ) : canRegister ? (
              <form action={registerEventAction}>
                <input type="hidden" name="eventId" value={event.id} />
                <Button type="submit">
                  <Ticket /> Register
                </Button>
              </form>
            ) : !past ? (
              <Button variant="outline" disabled>
                {full ? "Full" : "Registration closed"}
              </Button>
            ) : null}
            {canManage ? (
              <Button asChild variant="outline">
                <Link href={`/dashboard/events/${event.id}/edit`}>
                  <Pencil /> Edit
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-5 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {meta.map((m) => (
                <div key={m.label} className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <m.icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                    <p className="text-sm font-medium break-words">{m.value}</p>
                  </div>
                </div>
              ))}
            </div>
            {event.description ? (
              <div className="border-t pt-4">
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{event.description}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {canManage ? (
          <Panel title="Attendees" description={`${attendees.length} registered`}>
            {attendees.length === 0 ? (
              <EmptyState title="No registrations yet" />
            ) : (
              <ul className="divide-y">
                {attendees.map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-medium">{a.name}</span>
                    <Badge variant="secondary">{ROLE_LABELS[a.role]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ) : (
          <Panel title="Registration">
            <p className="text-sm text-muted-foreground">
              {event.isRegistered
                ? "You're registered for this event."
                : past
                  ? "This event has ended."
                  : event.registrationOpen
                    ? full
                      ? "This event is full."
                      : "Registration is open — use the Register button above."
                    : "Registration is closed."}
            </p>
          </Panel>
        )}
      </div>
    </>
  );
}
