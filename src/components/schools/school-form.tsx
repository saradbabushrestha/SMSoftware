"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { createSchoolAction, updateSchoolAction, type SchoolFormState } from "@/lib/schools/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export interface SchoolFormDefaults {
  name?: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string;
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
      {mode === "create" ? "Create school" : "Save changes"}
    </Button>
  );
}

export function SchoolForm({
  mode,
  defaults,
  schoolId,
}: {
  mode: "create" | "edit";
  defaults?: SchoolFormDefaults;
  schoolId?: string;
}) {
  const action = mode === "create" ? createSchoolAction : updateSchoolAction;
  const [state, formAction] = useActionState<SchoolFormState, FormData>(action, {});
  const err = (n: string) => state.fieldErrors?.[n];

  return (
    <form action={formAction} className="space-y-4">
      {schoolId ? <input type="hidden" name="id" value={schoolId} /> : null}

      {state.error ? (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="School name" htmlFor="name" error={err("name")}>
              <Input id="name" name="name" defaultValue={defaults?.name} required />
            </Field>
          </div>
          <Field label="Code" htmlFor="code" error={err("code")} hint="Short slug, unique platform-wide">
            <Input id="code" name="code" defaultValue={defaults?.code} required />
          </Field>
          <Field label="Email" htmlFor="email" error={err("email")}>
            <Input id="email" name="email" type="email" defaultValue={defaults?.email} />
          </Field>
          <Field label="Phone" htmlFor="phone" error={err("phone")}>
            <Input id="phone" name="phone" defaultValue={defaults?.phone} />
          </Field>
          <Field label="City" htmlFor="city" error={err("city")}>
            <Input id="city" name="city" defaultValue={defaults?.city} />
          </Field>
          <Field label="Country" htmlFor="country" error={err("country")}>
            <Input id="country" name="country" defaultValue={defaults?.country ?? "Nepal"} />
          </Field>
          <Field label="Timezone" htmlFor="timezone" error={err("timezone")}>
            <Input id="timezone" name="timezone" defaultValue={defaults?.timezone ?? "Asia/Kathmandu"} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address" htmlFor="address" error={err("address")}>
              <Textarea id="address" name="address" defaultValue={defaults?.address} rows={2} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="outline">
          <Link href={schoolId ? `/dashboard/schools/${schoolId}` : "/dashboard/schools"}>Cancel</Link>
        </Button>
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}
