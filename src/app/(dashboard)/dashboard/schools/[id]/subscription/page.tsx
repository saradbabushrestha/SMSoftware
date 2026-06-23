import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { db } from "@/lib/db";
import { getSubscription } from "@/lib/subscriptions/queries";
import { dateInputValue } from "@/lib/subscriptions/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { SubscriptionForm } from "@/components/subscriptions/subscription-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Subscription" };

export default async function ManageSubscriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("subscription:manage");

  const school = await db.school.findFirst({ where: { id, deletedAt: null }, select: { id: true, name: true } });
  if (!school) notFound();

  const sub = await getSubscription(school.id);

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href={`/dashboard/schools/${school.id}`}>
          <ArrowLeft /> Back to school
        </Link>
      </Button>
      <PageHeader title="Subscription" description={`Plan & billing for ${school.name}`} />
      <SubscriptionForm
        schoolId={school.id}
        defaults={
          sub
            ? {
                plan: sub.plan,
                status: sub.status,
                seats: String(sub.seats),
                priceNpr: String(sub.priceNpr),
                renewsAt: sub.renewsAt ? dateInputValue(sub.renewsAt) : undefined,
                note: sub.note ?? undefined,
              }
            : undefined
        }
      />
    </div>
  );
}
