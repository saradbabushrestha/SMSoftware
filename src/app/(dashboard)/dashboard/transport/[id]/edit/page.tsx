import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { getRoute } from "@/lib/transport/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { RouteForm } from "@/components/transport/route-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Edit route" };

export default async function EditRoutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("transport:manage");
  const route = await getRoute(user, id);
  if (!route) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href={`/dashboard/transport/${id}`}>
          <ArrowLeft /> Back to route
        </Link>
      </Button>
      <PageHeader title={`Edit ${route.name}`} />
      <RouteForm
        mode="edit"
        routeId={route.id}
        schools={[]}
        isSuperAdmin={false}
        defaults={{
          name: route.name,
          description: route.description ?? undefined,
          vehicleNumber: route.vehicleNumber ?? undefined,
          driverName: route.driverName ?? undefined,
          driverPhone: route.driverPhone ?? undefined,
          capacity: String(route.capacity),
          fare: String(route.fare),
        }}
      />
    </div>
  );
}
