import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { PageHeader } from "@/components/dashboard/page-header";
import { AnnouncementForm } from "@/components/announcements/announcement-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Post announcement" };

export default async function NewAnnouncementPage() {
  await requirePermission("announcement:manage");

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/announcements">
          <ArrowLeft /> Back to announcements
        </Link>
      </Button>
      <PageHeader title="Post announcement" description="Share a notice with your school." />
      <AnnouncementForm mode="create" />
    </div>
  );
}
