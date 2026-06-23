import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/page-header";
import { EventForm } from "@/components/events/event-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Add event" };

export default async function NewEventPage() {
  const user = await requirePermission("event:manage");
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const schools = isSuperAdmin
    ? await db.school.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } })
    : [];

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/events">
          <ArrowLeft /> Back to events
        </Link>
      </Button>
      <PageHeader title="Add event" description="Create an event students and staff can register for." />
      <EventForm mode="create" schools={schools} isSuperAdmin={isSuperAdmin} />
    </div>
  );
}
