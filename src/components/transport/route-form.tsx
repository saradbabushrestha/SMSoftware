"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { createRouteAction, updateRouteAction, type RouteFormState } from "@/lib/transport/actions";
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

export interface RouteFormDefaults {
  name?: string;
  description?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  capacity?: string;
  fare?: string;
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
      {mode === "create" ? "Create route" : "Save changes"}
    </Button>
  );
}

export function RouteForm({
  mode,
  schools,
  isSuperAdmin,
  defaults,
  routeId,
}: {
  mode: "create" | "edit";
  schools: { id: string; name: string }[];
  isSuperAdmin: boolean;
  defaults?: RouteFormDefaults;
  routeId?: string;
}) {
  const action = mode === "create" ? createRouteAction : updateRouteAction;
  const [state, formAction] = useActionState<RouteFormState, FormData>(action, {});
  const err = (n: string) => state.fieldErrors?.[n];

  return (
    <form action={formAction} className="space-y-4">
      {routeId ? <input type="hidden" name="id" value={routeId} /> : null}

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
            <Field label="Route name" htmlFor="name" error={err("name")} hint="e.g. Route 1 — Lakeside">
              <Input id="name" name="name" defaultValue={defaults?.name} required />
            </Field>
          </div>
          <Field label="Vehicle number" htmlFor="vehicleNumber" error={err("vehicleNumber")}>
            <Input id="vehicleNumber" name="vehicleNumber" defaultValue={defaults?.vehicleNumber} placeholder="Ba 12 Pa 3456" />
          </Field>
          <Field label="Capacity" htmlFor="capacity" error={err("capacity")} hint="0 = unlimited">
            <Input id="capacity" name="capacity" type="number" min={0} defaultValue={defaults?.capacity ?? "0"} />
          </Field>
          <Field label="Driver name" htmlFor="driverName" error={err("driverName")}>
            <Input id="driverName" name="driverName" defaultValue={defaults?.driverName} />
          </Field>
          <Field label="Driver phone" htmlFor="driverPhone" error={err("driverPhone")}>
            <Input id="driverPhone" name="driverPhone" defaultValue={defaults?.driverPhone} />
          </Field>
          <Field label="Monthly fare (₨)" htmlFor="fare" error={err("fare")}>
            <Input id="fare" name="fare" type="number" min={0} step="1" defaultValue={defaults?.fare ?? "0"} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description" htmlFor="description" error={err("description")} hint="Stops, timings, notes">
              <Textarea id="description" name="description" defaultValue={defaults?.description} rows={3} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="outline">
          <Link href={routeId ? `/dashboard/transport/${routeId}` : "/dashboard/transport"}>Cancel</Link>
        </Button>
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}
