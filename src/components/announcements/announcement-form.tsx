"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2, Save, Pin } from "lucide-react";
import { createAnnouncementAction, updateAnnouncementAction, type AnnouncementFormState } from "@/lib/announcements/actions";
import { AUDIENCE_OPTIONS } from "@/lib/announcements/display";
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

export interface AnnouncementFormDefaults {
  title?: string;
  body?: string;
  audience?: "ALL" | "STAFF" | "STUDENTS" | "PARENTS";
  pinned?: boolean;
  expiresAt?: string;
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

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Save />}
      {mode === "create" ? "Post announcement" : "Save changes"}
    </Button>
  );
}

export function AnnouncementForm({
  mode,
  defaults,
  announcementId,
}: {
  mode: "create" | "edit";
  defaults?: AnnouncementFormDefaults;
  announcementId?: string;
}) {
  const action = mode === "create" ? createAnnouncementAction : updateAnnouncementAction;
  const [state, formAction] = useActionState<AnnouncementFormState, FormData>(action, {});
  const err = (n: string) => state.fieldErrors?.[n];

  return (
    <form action={formAction} className="space-y-4">
      {announcementId ? <input type="hidden" name="id" value={announcementId} /> : null}

      {state.error ? (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Title" htmlFor="title" error={err("title")}>
              <Input id="title" name="title" defaultValue={defaults?.title} placeholder="e.g. Parent–teacher meeting on Friday" required />
            </Field>
          </div>
          <Field label="Audience" error={err("audience")}>
            <Select name="audience" defaultValue={defaults?.audience ?? "ALL"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Expires (optional)" htmlFor="expiresAt" error={err("expiresAt")}>
            <Input id="expiresAt" name="expiresAt" type="datetime-local" defaultValue={defaults?.expiresAt} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Message" htmlFor="body" error={err("body")}>
              <Textarea id="body" name="body" defaultValue={defaults?.body} rows={7} placeholder="Write the announcement…" required />
            </Field>
          </div>
          <label className="flex items-center gap-2.5 rounded-md border bg-muted/40 px-4 py-3 sm:col-span-2">
            <input
              type="checkbox"
              name="pinned"
              defaultChecked={defaults?.pinned}
              className="size-4 rounded border-input accent-primary"
            />
            <span className="inline-flex items-center gap-1.5 text-sm font-medium">
              <Pin className="size-3.5 text-muted-foreground" /> Pin to the top of the board
            </span>
          </label>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="outline">
          <Link href={announcementId ? `/dashboard/announcements/${announcementId}` : "/dashboard/announcements"}>Cancel</Link>
        </Button>
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}
