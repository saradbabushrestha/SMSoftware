import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Truck, User as UserIcon, Phone, Wallet, MapPin, X } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { getRoute, getUnassignedStudents } from "@/lib/transport/queries";
import { unassignStudentAction } from "@/lib/transport/actions";
import { capacityLabel, formatNpr, isFull } from "@/lib/transport/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/widgets";
import { AssignDialog } from "@/components/transport/assign-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Route" };

export default async function RouteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("transport:view");
  const route = await getRoute(user, id);
  if (!route) notFound();

  const canManage = can(user, "transport:manage");
  const full = isFull(route.assignments.length, route.capacity);
  const unassigned = canManage ? await getUnassignedStudents(route.schoolId) : [];

  const meta = [
    { icon: Truck, label: "Vehicle", value: route.vehicleNumber ?? "—" },
    { icon: UserIcon, label: "Driver", value: route.driverName ?? "—" },
    { icon: Phone, label: "Driver phone", value: route.driverPhone ?? "—" },
    { icon: Wallet, label: "Monthly fare", value: route.fare > 0 ? formatNpr(route.fare) : "—" },
  ];

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/transport">
          <ArrowLeft /> Back to transport
        </Link>
      </Button>

      <PageHeader
        title={route.name}
        description={
          <Badge variant={full ? "warning" : "secondary"}>
            {capacityLabel(route.assignments.length, route.capacity)} riders
          </Badge>
        }
        actions={
          canManage ? (
            <Button asChild variant="outline">
              <Link href={`/dashboard/transport/${route.id}/edit`}>
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
            {route.description ? <p className="border-t pt-3 text-sm text-muted-foreground">{route.description}</p> : null}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Riders</h3>
                <p className="text-xs text-muted-foreground">Students assigned to this route</p>
              </div>
              {canManage ? <AssignDialog routeId={route.id} students={unassigned} disabled={full} /> : null}
            </div>

            {route.assignments.length === 0 ? (
              <EmptyState title="No students assigned" description={canManage ? "Assign students to this route." : undefined} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Admission</TableHead>
                    <TableHead>Stop</TableHead>
                    {canManage ? <TableHead className="text-right">Action</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {route.assignments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        {a.student.user.firstName} {a.student.user.lastName}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{a.student.admissionNumber}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.stop ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3.5" /> {a.stop}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      {canManage ? (
                        <TableCell className="text-right">
                          <form action={unassignStudentAction}>
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
