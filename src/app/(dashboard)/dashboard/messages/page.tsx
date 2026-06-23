import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, Send, Plus, Mail } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { listMessages, getUnreadCount } from "@/lib/messages/queries";
import { normalizeBox, fmtShort, initials } from "@/lib/messages/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { Pagination } from "@/components/dashboard/pagination";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ box?: string; page?: string }>;
}) {
  const user = await requirePermission("message:send");
  const sp = await searchParams;
  const box = normalizeBox(sp.box);
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ rows, total, totalPages, pageSize }, unread] = await Promise.all([
    listMessages(user, { box, page }),
    getUnreadCount(user),
  ]);

  const tab = (key: "inbox" | "sent", label: string, Icon: typeof Inbox) => (
    <Button asChild variant={box === key ? "default" : "outline"} size="sm">
      <Link href={`/dashboard/messages?box=${key}`}>
        <Icon /> {label}
        {key === "inbox" && unread > 0 ? (
          <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground">
            {unread}
          </span>
        ) : null}
      </Link>
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Messages"
        description="Your private inbox."
        actions={
          <Button asChild>
            <Link href="/dashboard/messages/new">
              <Plus /> Compose
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        {tab("inbox", "Inbox", Inbox)}
        {tab("sent", "Sent", Send)}
      </div>

      <Card className="p-2">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Mail className="size-6" />
            </span>
            <h2 className="text-lg font-semibold tracking-tight">{box === "inbox" ? "Your inbox is empty" : "No sent messages"}</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              {box === "inbox" ? "Messages from staff, students and parents will appear here." : "Messages you send will appear here."}
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map((m) => {
              const other = box === "inbox" ? m.sender : m.recipient;
              const unreadRow = box === "inbox" && m.readAt === null;
              return (
                <li key={m.id}>
                  <Link href={`/dashboard/messages/${m.id}`} className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/50">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials(other.firstName, other.lastName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {unreadRow ? <span className="size-2 shrink-0 rounded-full bg-destructive" aria-label="Unread" /> : null}
                        <span className={cn("truncate text-sm", unreadRow ? "font-semibold" : "font-medium")}>
                          {box === "sent" ? "To: " : ""}{other.firstName} {other.lastName}
                        </span>
                      </div>
                      <p className={cn("truncate text-sm", unreadRow ? "font-medium" : "text-muted-foreground")}>{m.subject}</p>
                      <p className="truncate text-xs text-muted-foreground">{m.body}</p>
                    </div>
                    <span className="shrink-0 self-start text-xs text-muted-foreground">{fmtShort(m.createdAt)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <div className="px-2">
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} />
        </div>
      </Card>
    </>
  );
}
