"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { EventType } from "@prisma/client";
import { createEventAction, updateEventAction, type EventFormState } from "@/lib/events/actions";
import { EVENT_TYPE_LABELS } from "@/lib/events/display";
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

export interface EventFormDefaults {
  title?: string;
  type?: EventType;
  description?: string;
  location?: string;
  startsAt?: string; // yyyy-MM-ddTHH:mm
  endsAt?: string;
  capacity?: string;
  registrationOpen?: boolean;
}

function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor?: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Save />}
      {mode === "create" ? "Create event" : "Save changes"}
    </Button>
  );
}

export function EventForm({
  mode,
  schools,
  isSuperAdmin,
  defaults,
  eventId,
}: {
  mode: "create" | "edit";
  schools: { id: string; name: string }[];
  isSuperAdmin: boolean;
  defaults?: EventFormDefaults;
  eventId?: string;
}) {
  const action = mode === "create" ? createEventAction : updateEventAction;
  const [state, formAction] = useActionState<EventFormState, FormData>(action, {});
  const err = (n: string) => state.fieldErrors?.[n];

  return (
    <form action={formAction} className="space-y-4">
      {eventId ? <input type="hidden" name="id" value={eventId} /> : null}

      {state.error ? (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          {mode === "create" && isSuperAdmin ? (
            <div className="sm:col-span-2">
              <Field label="School" error={err("schoolId")}>
                <Select name="schoolId" defaultValue={schools[0]?.id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a school" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          ) : null}

          <div className="sm:col-span-2">
            <Field label="Title" htmlFor="title" error={err("title")}>
              <Input id="title" name="title" defaultValue={defaults?.title} required />
            </Field>
          </div>
          <Field label="Type" error={err("type")}>
            <Select name="type" defaultValue={defaults?.type ?? "GENERAL"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((t) => (
                  <SelectItem key={t} value={t}>{EVENT_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Location" htmlFor="location" error={err("location")}>
            <Input id="location" name="location" defaultValue={defaults?.location} placeholder="e.g. Main hall" />
          </Field>
          <Field label="Starts at" htmlFor="startsAt" error={err("startsAt")}>
            <Input id="startsAt" name="startsAt" type="datetime-local" defaultValue={defaults?.startsAt} required />
          </Field>
          <Field label="Ends at" htmlFor="endsAt" error={err("endsAt")} hint="Optional">
            <Input id="endsAt" name="endsAt" type="datetime-local" defaultValue={defaults?.endsAt} />
          </Field>
          <Field label="Capacity" htmlFor="capacity" error={err("capacity")} hint="0 = unlimited">
            <Input id="capacity" name="capacity" type="number" min={0} defaultValue={defaults?.capacity ?? "0"} />
          </Field>
          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="registrationOpen"
                defaultChecked={defaults?.registrationOpen ?? true}
                className="size-4 accent-[var(--primary)]"
              />
              Registration open
            </label>
          </div>
          <div className="sm:col-span-2">
            <Field label="Description" htmlFor="description" error={err("description")}>
              <Textarea id="description" name="description" defaultValue={defaults?.description} rows={3} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="outline">
          <Link href={eventId ? `/dashboard/events/${eventId}` : "/dashboard/events"}>Cancel</Link>
        </Button>
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}
