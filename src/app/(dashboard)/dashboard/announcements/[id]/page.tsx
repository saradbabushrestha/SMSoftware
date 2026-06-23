import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Pin, PinOff, Trash2, Clock } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { db } from "@/lib/db";
import { getAnnouncement } from "@/lib/announcements/queries";
import { togglePinAction, deleteAnnouncementAction } from "@/lib/announcements/actions";
import { AUDIENCE_LABELS, AUDIENCE_VARIANT, fmtDateTime, isExpired } from "@/lib/announcements/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Announcement" };

export default async function AnnouncementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("announcement:view");
  const canManage = can(user, "announcement:manage");
  const a = await getAnnouncement(user, id, canManage);
  if (!a) notFound();

  const author = a.authorId
    ? await db.user.findUnique({ where: { id: a.authorId }, select: { firstName: true, lastName: true } })
    : null;
  const expired = isExpired(a.expiresAt, new Date());

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/announcements">
          <ArrowLeft /> Back to announcements
        </Link>
      </Button>

      <PageHeader
        title={a.title}
        description={author ? <>Posted by {author.firstName} {author.lastName} · {fmtDateTime(a.publishedAt)}</> : fmtDateTime(a.publishedAt)}
        actions={
          canManage ? (
            <div className="flex items-center gap-2">
              <form action={togglePinAction}>
                <input type="hidden" name="id" value={a.id} />
                <Button type="submit" variant="outline">
                  {a.pinned ? <PinOff /> : <Pin />} {a.pinned ? "Unpin" : "Pin"}
                </Button>
              </form>
              <Button asChild variant="outline">
                <Link href={`/dashboard/announcements/${a.id}/edit`}>
                  <Pencil /> Edit
                </Link>
              </Button>
              <form action={deleteAnnouncementAction}>
                <input type="hidden" name="id" value={a.id} />
                <Button type="submit" variant="outline" className="text-destructive">
                  <Trash2 /> Delete
                </Button>
              </form>
            </div>
          ) : undefined
        }
      />

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-2">
            {a.pinned ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                <Pin className="size-3.5" /> Pinned
              </span>
            ) : null}
            <Badge variant={AUDIENCE_VARIANT[a.audience]}>{AUDIENCE_LABELS[a.audience]}</Badge>
            {expired ? (
              <Badge variant="outline" className="text-muted-foreground">
                <Clock className="size-3" /> Expired
              </Badge>
            ) : null}
          </div>

          <p className="whitespace-pre-wrap text-sm leading-relaxed">{a.body}</p>

          {a.expiresAt ? (
            <p className="border-t pt-3 text-xs text-muted-foreground">
              {expired ? "Expired" : "Expires"} {fmtDateTime(a.expiresAt)}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
