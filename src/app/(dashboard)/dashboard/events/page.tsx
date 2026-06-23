import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Plus, CalendarClock, Ticket } from "lucide-react";
import type { EventType } from "@prisma/client";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { listEvents, getEventStats } from "@/lib/events/queries";
import { EVENT_TYPE_LABELS, EVENT_TYPE_VARIANT, formatEventWhen, isPast, capacityLabel } from "@/lib/events/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Pagination } from "@/components/dashboard/pagination";
import { EventsFilters } from "@/components/events/events-filters";
import { EventRowActions } from "@/components/events/event-row-actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Events" };

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; when?: string; page?: string }>;
}) {
  const user = await requirePermission("event:view");
  const sp = await searchParams;
  const type = sp.type && sp.type in EVENT_TYPE_LABELS ? (sp.type as EventType) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ rows, total, totalPages, pageSize }, stats] = await Promise.all([
    listEvents(user, { type, when: sp.when, page }),
    getEventStats(user),
  ]);

  const canManage = can(user, "event:manage");

  return (
    <>
      <PageHeader
        title="Events"
        description="School events, competitions and meetings."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/dashboard/events/new">
                <Plus /> Add event
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total events" value={stats.total.toLocaleString()} icon={CalendarDays} />
        <StatCard label="Upcoming" value={stats.upcoming.toLocaleString()} icon={CalendarClock} accent="info" />
        <StatCard label="My registrations" value={stats.registered.toLocaleString()} icon={Ticket} accent="success" />
      </div>

      <Card className="p-4">
        <EventsFilters initialType={sp.type} initialWhen={sp.when} />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>When</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  No events found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((e) => {
                const past = isPast(e.startsAt);
                return (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Link href={`/dashboard/events/${e.id}`} className="font-medium hover:underline">
                        {e.title}
                      </Link>
                      <span className="ml-2">
                        <Badge variant={EVENT_TYPE_VARIANT[e.type]}>{EVENT_TYPE_LABELS[e.type]}</Badge>
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatEventWhen(e.startsAt, e.endsAt)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{e.location ?? "—"}</TableCell>
                    <TableCell className="text-sm">{capacityLabel(e._count.registrations, e.capacity)}</TableCell>
                    <TableCell>
                      <Badge variant={past ? "secondary" : "success"}>{past ? "Past" : "Upcoming"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <EventRowActions id={e.id} title={e.title} canManage={canManage} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} />
      </Card>
    </>
  );
}
