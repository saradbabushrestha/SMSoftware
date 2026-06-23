import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, BedDouble, UserCog, StickyNote, X } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { getRoom, getUnassignedStudents } from "@/lib/hostel/queries";
import { unassignRoomAction } from "@/lib/hostel/actions";
import { HOSTEL_TYPE_LABELS, HOSTEL_TYPE_VARIANT, occupancyLabel, isFull } from "@/lib/hostel/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/widgets";
import { AssignDialog } from "@/components/hostel/assign-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Room" };

export default async function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("hostel:view");
  const room = await getRoom(user, id);
  if (!room) notFound();

  const canManage = can(user, "hostel:manage");
  const full = isFull(room.assignments.length, room.capacity);
  const unassigned = canManage ? await getUnassignedStudents(room.schoolId) : [];

  const meta = [
    { icon: BedDouble, label: "Capacity", value: `${room.capacity} bed${room.capacity === 1 ? "" : "s"}` },
    { icon: UserCog, label: "Warden", value: room.wardenName ?? "—" },
    { icon: StickyNote, label: "Notes", value: room.notes ?? "—" },
  ];

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/hostel">
          <ArrowLeft /> Back to hostel
        </Link>
      </Button>

      <PageHeader
        title={`${room.block} · ${room.number}`}
        description={
          <span className="inline-flex items-center gap-2">
            <Badge variant={HOSTEL_TYPE_VARIANT[room.gender]}>{HOSTEL_TYPE_LABELS[room.gender]}</Badge>
            <Badge variant={full ? "warning" : "secondary"}>{occupancyLabel(room.assignments.length, room.capacity)} occupied</Badge>
          </span>
        }
        actions={
          canManage ? (
            <Button asChild variant="outline">
              <Link href={`/dashboard/hostel/${room.id}/edit`}>
                <Pencil /> Edit
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="space-y-4 p-6">
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
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Occupants</h3>
                <p className="text-xs text-muted-foreground">Students assigned to this room</p>
              </div>
              {canManage ? <AssignDialog roomId={room.id} students={unassigned} disabled={full} /> : null}
            </div>

            {room.assignments.length === 0 ? (
              <EmptyState title="No occupants" description={canManage ? "Assign students to this room." : undefined} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Admission</TableHead>
                    <TableHead>Bed</TableHead>
                    {canManage ? <TableHead className="text-right">Action</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {room.assignments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        {a.student.user.firstName} {a.student.user.lastName}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{a.student.admissionNumber}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.bedNumber ?? "—"}</TableCell>
                      {canManage ? (
                        <TableCell className="text-right">
                          <form action={unassignRoomAction}>
                            <input type="hidden" name="assignmentId" value={a.id} />
                            <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <X /> Remove
                            </Button>
                          </form>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
