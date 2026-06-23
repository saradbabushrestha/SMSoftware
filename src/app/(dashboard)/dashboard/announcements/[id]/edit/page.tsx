import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { getAnnouncement } from "@/lib/announcements/queries";
import { dateTimeInputValue } from "@/lib/announcements/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { AnnouncementForm } from "@/components/announcements/announcement-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Edit announcement" };

export default async function EditAnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("announcement:manage");
  const a = await getAnnouncement(user, id, true);
  if (!a) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href={`/dashboard/announcements/${id}`}>
          <ArrowLeft /> Back to announcement
        </Link>
      </Button>
      <PageHeader title="Edit announcement" description={a.title} />
      <AnnouncementForm
        mode="edit"
        announcementId={a.id}
        defaults={{
          title: a.title,
          body: a.body,
          audience: a.audience,
          pinned: a.pinned,
          expiresAt: a.expiresAt ? dateTimeInputValue(a.expiresAt) : undefined,
        }}
      />
    </div>
  );
}
