import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Reply, Trash2 } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { getMessage } from "@/lib/messages/queries";
import { deleteMessageAction } from "@/lib/messages/actions";
import { fmtDateTime, initials, replySubject } from "@/lib/messages/display";
import { PageHeader } from "@/components/dashboard/page-header";
import { MarkReadOnView } from "@/components/messages/mark-read-on-view";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Message" };

export default async function MessageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("message:send");
  const m = await getMessage(user, id);
  if (!m) notFound();

  const isRecipient = m.recipientId === user.id;
  const other = isRecipient ? m.sender : m.recipient;
  const unread = isRecipient && m.readAt === null;
  const replyHref = `/dashboard/messages/new?to=${other.id}&subject=${encodeURIComponent(replySubject(m.subject))}`;

  return (
    <div className="mx-auto max-w-2xl">
      {unread ? <MarkReadOnView id={m.id} /> : null}

      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href={`/dashboard/messages?box=${isRecipient ? "inbox" : "sent"}`}>
          <ArrowLeft /> Back to messages
        </Link>
      </Button>

      <PageHeader
        title={m.subject}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href={replyHref}>
                <Reply /> Reply
              </Link>
            </Button>
            <form action={deleteMessageAction}>
              <input type="hidden" name="id" value={m.id} />
              <Button type="submit" variant="outline" className="text-destructive">
                <Trash2 /> Delete
              </Button>
            </form>
          </div>
        }
      />

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 border-b pb-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {initials(other.firstName, other.lastName)}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {isRecipient ? "From" : "To"}: {other.firstName} {other.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{fmtDateTime(m.createdAt)}</p>
            </div>
          </div>
          <p className="whitespace-pre-wrap pt-4 text-sm leading-relaxed">{m.body}</p>
        </CardContent>
      </Card>
    </div>
  );
}
