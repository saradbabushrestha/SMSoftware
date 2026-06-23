import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/rbac/authorize";
import { getRecipients } from "@/lib/messages/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { MessageForm } from "@/components/messages/message-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Compose message" };

export default async function NewMessagePage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string; subject?: string }>;
}) {
  const user = await requirePermission("message:send");
  const sp = await searchParams;
  const recipients = await getRecipients(user);
  // Only honour a prefilled recipient that's actually messageable.
  const defaultRecipientId = sp.to && recipients.some((r) => r.id === sp.to) ? sp.to : undefined;

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-2">
        <Link href="/dashboard/messages">
          <ArrowLeft /> Back to messages
        </Link>
      </Button>
      <PageHeader title="Compose message" description="Send a private message to someone at your school." />
      <MessageForm recipients={recipients} defaultRecipientId={defaultRecipientId} defaultSubject={sp.subject} />
    </div>
  );
}
