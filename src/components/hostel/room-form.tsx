"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { HostelType } from "@prisma/client";
import { createRoomAction, updateRoomAction, type RoomFormState } from "@/lib/hostel/actions";
import { HOSTEL_TYPE_LABELS } from "@/lib/hostel/display";
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

export interface RoomFormDefaults {
  block?: string;
  number?: string;
  gender?: HostelType;
  capacity?: string;
  wardenName?: string;
  notes?: string;
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
      {mode === "create" ? "Create room" : "Save changes"}
    </Button>
  );
}

export function RoomForm({
  mode,
  schools,
  isSuperAdmin,
  defaults,
  roomId,
}: {
  mode: "create" | "edit";
  schools: { id: string; name: string }[];
  isSuperAdmin: boolean;
  defaults?: RoomFormDefaults;
  roomId?: string;
}) {
  const action = mode === "create" ? createRoomAction : updateRoomAction;
  const [state, formAction] = useActionState<RoomFormState, FormData>(action, {});
  const err = (n: string) => state.fieldErrors?.[n];

  return (
    <form action={formAction} className="space-y-4">
      {roomId ? <input type="hidden" name="id" value={roomId} /> : null}

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

          <Field label="Block" htmlFor="block" error={err("block")} hint="e.g. Block A">
            <Input id="block" name="block" defaultValue={defaults?.block} required />
          </Field>
          <Field label="Room number" htmlFor="number" error={err("number")}>
            <Input id="number" name="number" defaultValue={defaults?.number} required />
          </Field>
          <Field label="Type" error={err("gender")}>
            <Select name="gender" defaultValue={defaults?.gender ?? "MIXED"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(HOSTEL_TYPE_LABELS) as HostelType[]).map((t) => (
                  <SelectItem key={t} value={t}>{HOSTEL_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Capacity (beds)" htmlFor="capacity" error={err("capacity")}>
            <Input id="capacity" name="capacity" type="number" min={1} max={50} defaultValue={defaults?.capacity ?? "2"} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Warden" htmlFor="wardenName" error={err("wardenName")}>
              <Input id="wardenName" name="wardenName" defaultValue={defaults?.wardenName} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Notes" htmlFor="notes" error={err("notes")}>
              <Textarea id="notes" name="notes" defaultValue={defaults?.notes} rows={2} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="outline">
          <Link href={roomId ? `/dashboard/hostel/${roomId}` : "/dashboard/hostel"}>Cancel</Link>
        </Button>
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}
