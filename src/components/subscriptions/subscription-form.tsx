"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { upsertSubscriptionAction, type SubscriptionFormState } from "@/lib/subscriptions/actions";
import { PLAN_OPTIONS, STATUS_OPTIONS } from "@/lib/subscriptions/display";
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

export interface SubscriptionFormDefaults {
  plan?: string;
  status?: string;
  seats?: string;
  priceNpr?: string;
  renewsAt?: string;
  note?: string;
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
      {pending ? <Loader2 className="animate-spin" /> : <Save />}
      Save subscription
    </Button>
  );
}

export function SubscriptionForm({ schoolId, defaults }: { schoolId: string; defaults?: SubscriptionFormDefaults }) {
  const [state, formAction] = useActionState<SubscriptionFormState, FormData>(upsertSubscriptionAction, {});
  const err = (n: string) => state.fieldErrors?.[n];

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="schoolId" value={schoolId} />

      {state.error ? (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <Field label="Plan" error={err("plan")}>
            <Select name="plan" defaultValue={defaults?.plan ?? "TRIAL"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAN_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status" error={err("status")}>
            <Select name="status" defaultValue={defaults?.status ?? "TRIALING"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Seats (max accounts)" htmlFor="seats" error={err("seats")}>
            <Input id="seats" name="seats" type="number" min={1} step="1" defaultValue={defaults?.seats ?? "50"} required />
          </Field>
          <Field label="Monthly price (₨)" htmlFor="priceNpr" error={err("priceNpr")}>
            <Input id="priceNpr" name="priceNpr" type="number" min={0} step="1" defaultValue={defaults?.priceNpr ?? "0"} required />
          </Field>
          <Field label="Renews on (optional)" htmlFor="renewsAt" error={err("renewsAt")}>
            <Input id="renewsAt" name="renewsAt" type="date" defaultValue={defaults?.renewsAt} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Note (optional)" htmlFor="note" error={err("note")}>
              <Textarea id="note" name="note" rows={2} defaultValue={defaults?.note} placeholder="Billing notes, custom terms…" />
            </Field>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="outline">
          <Link href={`/dashboard/schools/${schoolId}`}>Cancel</Link>
        </Button>
        <SubmitButton />
      </div>
    </form>
  );
}
