import type { Metadata } from "next";
import Link from "next/link";
import { Bus, Plus, Truck, Users } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { listRoutes, getTransportStats } from "@/lib/transport/queries";
import { capacityLabel, formatNpr } from "@/lib/transport/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Pagination } from "@/components/dashboard/pagination";
import { TransportFilters } from "@/components/transport/transport-filters";
import { RouteRowActions } from "@/components/transport/route-row-actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Transport" };

export default async function TransportPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await requirePermission("transport:view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const canManage = can(user, "transport:manage");

  const [{ rows, total, totalPages, pageSize }, stats] = await Promise.all([
    listRoutes(user, { q: sp.q, page }),
    getTransportStats(user),
  ]);

  return (
    <>
      <PageHeader
        title="Transport"
        description="Routes, vehicles and student assignments."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/dashboard/transport/new">
                <Plus /> Add route
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Routes" value={stats.routes.toLocaleString()} icon={Bus} />
        <StatCard label="Vehicles" value={stats.vehicles.toLocaleString()} icon={Truck} accent="info" />
        <StatCard label="Students riding" value={stats.assigned.toLocaleString()} icon={Users} accent="success" />
      </div>

      <Card className="p-4">
        <TransportFilters initialQ={sp.q} />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Route</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Riders</TableHead>
              <TableHead>Fare</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  No routes found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link href={`/dashboard/transport/${r.id}`} className="font-medium hover:underline">
                      {r.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.vehicleNumber ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.driverName ?? "—"}</TableCell>
                  <TableCell className="text-sm">{capacityLabel(r._count.assignments, r.capacity)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.fare > 0 ? formatNpr(r.fare) : "—"}</TableCell>
                  <TableCell className="text-right">
                    <RouteRowActions id={r.id} name={r.name} canManage={canManage} />
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
