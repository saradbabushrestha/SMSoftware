"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2, Save, Info } from "lucide-react";
import { UserStatus } from "@prisma/client";
import {
  createTeacherAction,
  updateTeacherAction,
  type TeacherFormState,
} from "@/lib/teachers/actions";
import { USER_STATUS_LABELS } from "@/lib/teachers/display";
import { DEMO_PASSWORD } from "@/lib/auth/demo-accounts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export interface TeacherFormDefaults {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  employeeId?: string;
  qualification?: string;
  experienceYrs?: string;
  joinedOn?: string;
  status?: UserStatus;
  subjectIds?: string[];
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
      {mode === "create" ? "Create teacher" : "Save changes"}
    </Button>
  );
}

export function TeacherForm({
  mode,
  subjectOptions,
  schools,
  isSuperAdmin,
  defaults,
  teacherId,
  suggestedEmployeeId,
}: {
  mode: "create" | "edit";
  subjectOptions: { id: string; label: string }[];
  schools: { id: string; name: string }[];
  isSuperAdmin: boolean;
  defaults?: TeacherFormDefaults;
  teacherId?: string;
  suggestedEmployeeId?: string;
}) {
  const action = mode === "create" ? createTeacherAction : updateTeacherAction;
  const [state, formAction] = useActionState<TeacherFormState, FormData>(action, {});
  const err = (name: string) => state.fieldErrors?.[name];
  const selected = new Set(defaults?.subjectIds ?? []);
  const showSubjects = mode === "edit" || !isSuperAdmin;

  return (
    <form action={formAction} className="space-y-4">
      {teacherId ? <input type="hidden" name="id" value={teacherId} /> : null}

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
                will be set. The teacher should change it after first sign-in.
              </span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Personal details</CardTitle>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Professional</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Employee ID"
            htmlFor="employeeId"
            error={err("employeeId")}
            hint={mode === "create" ? "Leave blank to auto-generate." : undefined}
          >
            <Input
              id="employeeId"
              name="employeeId"
              defaultValue={defaults?.employeeId}
              placeholder={suggestedEmployeeId}
            />
          </Field>
          <Field label="Experience (years)" htmlFor="experienceYrs" error={err("experienceYrs")}>
            <Input
              id="experienceYrs"
              name="experienceYrs"
              type="number"
              min={0}
              max={60}
              defaultValue={defaults?.experienceYrs ?? "0"}
            />
          </Field>
          <Field label="Qualification" htmlFor="qualification" error={err("qualification")}>
            <Input id="qualification" name="qualification" defaultValue={defaults?.qualification} placeholder="e.g. M.Sc. Mathematics" />
          </Field>
          <Field label="Joined on" htmlFor="joinedOn" error={err("joinedOn")}>
            <Input id="joinedOn" name="joinedOn" type="date" defaultValue={defaults?.joinedOn} />
          </Field>
        </CardContent>
      </Card>

      {showSubjects ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Subjects taught</CardTitle>
          </CardHeader>
          <CardContent>
            {subjectOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subjects available for this school yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {subjectOptions.map((s) => (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent has-[:checked]:border-primary/40 has-[:checked]:bg-primary/5"
                  >
                    <input
                      type="checkbox"
                      name="subjectIds"
                      value={s.id}
                      defaultChecked={selected.has(s.id)}
                      className="size-4 accent-[var(--primary)]"
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>You can assign subjects after creating the teacher (edit their profile).</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="outline">
          <Link href={teacherId ? `/dashboard/teachers/${teacherId}` : "/dashboard/teachers"}>
            Cancel
          </Link>
        </Button>
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}
