"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2, Save, Info } from "lucide-react";
import { UserStatus } from "@prisma/client";
import {
  createGuardianAction,
  updateGuardianAction,
  type GuardianFormState,
} from "@/lib/guardians/actions";
import { USER_STATUS_LABELS } from "@/lib/users/status";
import { DEMO_PASSWORD } from "@/lib/auth/demo-accounts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export interface GuardianFormDefaults {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  occupation?: string;
  address?: string;
  status?: UserStatus;
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Save />}
      {mode === "create" ? "Create guardian" : "Save changes"}
    </Button>
  );
}

export function GuardianForm({
  mode,
  schools,
  isSuperAdmin,
  defaults,
  guardianId,
}: {
  mode: "create" | "edit";
  schools: { id: string; name: string }[];
  isSuperAdmin: boolean;
  defaults?: GuardianFormDefaults;
  guardianId?: string;
}) {
  const action = mode === "create" ? createGuardianAction : updateGuardianAction;
  const [state, formAction] = useActionState<GuardianFormState, FormData>(action, {});
  const err = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={formAction} className="space-y-4">
      {guardianId ? <input type="hidden" name="id" value={guardianId} /> : null}

      {state.error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      {mode === "create" ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Email" htmlFor="email" error={err("email")} hint="Used to sign in.">
                <Input id="email" name="email" type="email" defaultValue={defaults?.email} required />
              </Field>
              {isSuperAdmin ? (
                <Field label="School" error={err("schoolId")}>
                  <Select name="schoolId" defaultValue={schools[0]?.id}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a school" />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
            </div>
            <div className="flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" />
              <span>
                A temporary password (<code className="font-mono text-foreground">{DEMO_PASSWORD}</code>)
                will be set. The guardian should change it after first sign-in.
              </span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Guardian details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="firstName" error={err("firstName")}>
            <Input id="firstName" name="firstName" defaultValue={defaults?.firstName} required />
          </Field>
          <Field label="Last name" htmlFor="lastName" error={err("lastName")}>
            <Input id="lastName" name="lastName" defaultValue={defaults?.lastName} required />
          </Field>
          <Field label="Phone" htmlFor="phone" error={err("phone")}>
            <Input id="phone" name="phone" defaultValue={defaults?.phone} />
          </Field>
          <Field label="Occupation" htmlFor="occupation" error={err("occupation")}>
            <Input id="occupation" name="occupation" defaultValue={defaults?.occupation} />
          </Field>
          {mode === "edit" ? (
            <Field label="Status" error={err("status")}>
              <Select name="status" defaultValue={defaults?.status ?? "ACTIVE"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(USER_STATUS_LABELS) as UserStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {USER_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}
          <div className="sm:col-span-2">
            <Field label="Address" htmlFor="address" error={err("address")}>
              <Textarea id="address" name="address" defaultValue={defaults?.address} rows={2} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="outline">
          <Link href={guardianId ? `/dashboard/guardians/${guardianId}` : "/dashboard/guardians"}>
            Cancel
          </Link>
        </Button>
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}
