import type { Metadata } from "next";
import Link from "next/link";
import { BedDouble, Plus, DoorClosed, Users } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { listRooms, getHostelStats } from "@/lib/hostel/queries";
import { HOSTEL_TYPE_LABELS, HOSTEL_TYPE_VARIANT, occupancyLabel } from "@/lib/hostel/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Pagination } from "@/components/dashboard/pagination";
import { HostelFilters } from "@/components/hostel/hostel-filters";
import { RoomRowActions } from "@/components/hostel/room-row-actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Hostel" };

export default async function HostelPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await requirePermission("hostel:view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const canManage = can(user, "hostel:manage");

  const [{ rows, total, totalPages, pageSize }, stats] = await Promise.all([
    listRooms(user, { q: sp.q, page }),
    getHostelStats(user),
  ]);

  return (
    <>
      <PageHeader
        title="Hostel"
        description="Rooms, occupancy and student assignments."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/dashboard/hostel/new">
                <Plus /> Add room
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Rooms" value={stats.rooms.toLocaleString()} icon={DoorClosed} />
        <StatCard label="Beds" value={stats.beds.toLocaleString()} icon={BedDouble} accent="info" />
        <StatCard label="Occupied" value={stats.occupied.toLocaleString()} icon={Users} accent="success" />
      </div>

      <Card className="p-4">
        <HostelFilters initialQ={sp.q} />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Room</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Warden</TableHead>
              <TableHead>Occupancy</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  No rooms found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link href={`/dashboard/hostel/${r.id}`} className="font-medium hover:underline">
                      {r.block} · {r.number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={HOSTEL_TYPE_VARIANT[r.gender]}>{HOSTEL_TYPE_LABELS[r.gender]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.wardenName ?? "—"}</TableCell>
                  <TableCell className="text-sm">{occupancyLabel(r._count.assignments, r.capacity)}</TableCell>
                  <TableCell className="text-right">
                    <RoomRowActions id={r.id} name={`${r.block} · ${r.number}`} canManage={canManage} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} />
      </Card>
    </>
  );
}
