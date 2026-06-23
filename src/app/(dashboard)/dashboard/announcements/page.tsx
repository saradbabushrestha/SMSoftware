import type { Metadata } from "next";
import Link from "next/link";
import { Megaphone, Pin, Plus, Clock } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac/authorize";
import { listAnnouncements, getAnnouncementStats } from "@/lib/announcements/queries";
import { AUDIENCE_LABELS, AUDIENCE_VARIANT, fmtDateTime, isExpired } from "@/lib/announcements/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Pagination } from "@/components/dashboard/pagination";
import { AnnouncementRowActions } from "@/components/announcements/announcement-row-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Announcements" };

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requirePermission("announcement:view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const canManage = can(user, "announcement:manage");
  const now = new Date();

  const [{ rows, total, totalPages, pageSize }, stats] = await Promise.all([
    listAnnouncements(user, { page, manage: canManage }),
    getAnnouncementStats(user, canManage),
  ]);

  return (
    <>
      <PageHeader
        title="Announcements"
        description={canManage ? "Post and manage notices for your school." : "Notices and updates from your school."}
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/dashboard/announcements/new">
                <Plus /> Post announcement
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label={canManage ? "Total notices" : "Notices for you"} value={stats.total.toLocaleString()} icon={Megaphone} />
        <StatCard label="Pinned" value={stats.pinned.toLocaleString()} icon={Pin} accent="info" />
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Megaphone className="size-6" />
            </span>
            <h2 className="text-lg font-semibold tracking-tight">No announcements yet</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              {canManage ? "Post the first announcement to keep your school in the loop." : "Check back later for school updates."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((a) => {
            const expired = isExpired(a.expiresAt, now);
            return (
              <Card key={a.id} className={a.pinned ? "border-primary/30" : undefined}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1.5">
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
                      <Link href={`/dashboard/announcements/${a.id}`} className="block">
                        <h3 className="truncate text-base font-semibold tracking-tight hover:underline">{a.title}</h3>
                      </Link>
                      <p className="line-clamp-2 text-sm text-muted-foreground">{a.body}</p>
                      <p className="text-xs text-muted-foreground">{fmtDateTime(a.publishedAt)}</p>
                    </div>
                    {canManage ? <AnnouncementRowActions id={a.id} title={a.title} /> : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} />
      </div>
    </>
  );
}
