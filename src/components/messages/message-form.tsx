"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2, Send } from "lucide-react";
import { sendMessageAction, type MessageFormState } from "@/lib/messages/actions";
import { ROLE_LABELS } from "@/lib/rbac/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserRole } from "@prisma/client";

export interface Recipient {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

function Field({ label, htmlFor, error, children }: { label: string; htmlFor?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Send />}
      Send message
    </Button>
  );
}

export function MessageForm({
  recipients,
  defaultRecipientId,
  defaultSubject,
}: {
  recipients: Recipient[];
  defaultRecipientId?: string;
  defaultSubject?: string;
}) {
  const [state, formAction] = useActionState<MessageFormState, FormData>(sendMessageAction, {});
  const err = (n: string) => state.fieldErrors?.[n];

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <Card>
        <CardContent className="space-y-4 p-6">
          <Field label="To" error={err("recipientId")}>
            <Select name="recipientId" defaultValue={defaultRecipientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a recipient" />
              </SelectTrigger>
              <SelectContent>
                {recipients.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.firstName} {r.lastName} · {ROLE_LABELS[r.role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Subject" htmlFor="subject" error={err("subject")}>
            <Input id="subject" name="subject" defaultValue={defaultSubject} placeholder="What's this about?" required />
          </Field>
          <Field label="Message" htmlFor="body" error={err("body")}>
            <Textarea id="body" name="body" rows={8} placeholder="Write your message…" required />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="outline">
          <Link href="/dashboard/messages">Cancel</Link>
        </Button>
        <SubmitButton />
      </div>
    </form>
  );
}
