"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2, Save, Info } from "lucide-react";
import { UserRole, UserStatus } from "@prisma/client";
import { createUserAction, updateUserAction, type UserFormState } from "@/lib/users/actions";
import { ROLE_LABELS } from "@/lib/rbac/permissions";
import { USER_STATUS_LABELS } from "@/lib/users/status";
import { DEMO_PASSWORD } from "@/lib/auth/demo-accounts";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface UserFormDefaults {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  role?: UserRole;
  status?: UserStatus;
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
      {mode === "create" ? "Create user" : "Save changes"}
    </Button>
  );
}

export function UserForm({
  mode,
  assignable,
  isSuperAdmin,
  schools,
  defaults,
  userId,
  roleEditable = false,
  lockedRole,
}: {
  mode: "create" | "edit";
  assignable: UserRole[];
  isSuperAdmin: boolean;
  schools: { id: string; name: string }[];
  defaults?: UserFormDefaults;
  userId?: string;
  roleEditable?: boolean; // edit mode: may the role be changed?
  lockedRole?: UserRole; // edit mode: shown read-only when role isn't editable
}) {
  const action = mode === "create" ? createUserAction : updateUserAction;
  const [state, formAction] = useActionState<UserFormState, FormData>(action, {});
  const err = (n: string) => state.fieldErrors?.[n];
  const [role, setRole] = useState<UserRole>(defaults?.role ?? assignable[0]);

  const showSchool = isSuperAdmin && role !== "SUPER_ADMIN" && (mode === "create" || roleEditable);

  return (
    <form action={formAction} className="space-y-4">
      {userId ? <input type="hidden" name="id" value={userId} /> : null}

      {state.error ? (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          {mode === "create" ? (
            <div className="sm:col-span-2">
              <Field label="Email" htmlFor="email" error={err("email")} hint="Used to sign in.">
                <Input id="email" name="email" type="email" defaultValue={defaults?.email} required />
              </Field>
            </div>
          ) : null}

          <Field label="First name" htmlFor="firstName" error={err("firstName")}>
            <Input id="firstName" name="firstName" defaultValue={defaults?.firstName} required />
          </Field>
          <Field label="Last name" htmlFor="lastName" error={err("lastName")}>
            <Input id="lastName" name="lastName" defaultValue={defaults?.lastName} required />
          </Field>
          <Field label="Phone" htmlFor="phone" error={err("phone")}>
            <Input id="phone" name="phone" defaultValue={defaults?.phone} />
          </Field>

          {/* Role: selectable on create; on edit only when allowed (else read-only). */}
          {mode === "create" || roleEditable ? (
            <Field label="Role" error={err("role")}>
              <Select name="role" value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignable.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : (
            <Field label="Role" hint="Managed in the member's own module.">
              <Input value={lockedRole ? ROLE_LABELS[lockedRole] : ""} disabled />
            </Field>
          )}

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

          {showSchool ? (
            <div className="sm:col-span-2">
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
            </div>
          ) : null}
        </CardContent>
      </Card>

      {mode === "create" ? (
        <div className="flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>
            A temporary password (<code className="font-mono text-foreground">{DEMO_PASSWORD}</code>) will be set.
            To add students, teachers or guardians, use their own modules so a profile is created.
          </span>
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="outline">
          <Link href={userId ? `/dashboard/users/${userId}` : "/dashboard/users"}>Cancel</Link>
        </Button>
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}
