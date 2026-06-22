"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2, Save, Info } from "lucide-react";
import { Gender, BloodGroup, EnrollmentStatus } from "@prisma/client";
import {
  createStudentAction,
  updateStudentAction,
  type StudentFormState,
} from "@/lib/students/actions";
import { GENDER_LABELS, BLOOD_GROUP_LABELS, STATUS_LABELS } from "@/lib/students/display";
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

export interface StudentFormDefaults {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  gender?: Gender;
  dateOfBirth?: string; // yyyy-mm-dd
  bloodGroup?: BloodGroup;
  nationality?: string;
  address?: string;
  admissionNumber?: string;
  rollNumber?: string;
  sectionId?: string;
  status?: EnrollmentStatus;
}

function Field({
  label,
  htmlFor,
  error,
  children,
  hint,
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
      {mode === "create" ? "Create student" : "Save changes"}
    </Button>
  );
}

export function StudentForm({
  mode,
  sectionOptions,
  defaults,
  studentId,
  suggestedAdmissionNumber,
}: {
  mode: "create" | "edit";
  sectionOptions: { id: string; label: string }[];
  defaults?: StudentFormDefaults;
  studentId?: string;
  suggestedAdmissionNumber?: string;
}) {
  const action = mode === "create" ? createStudentAction : updateStudentAction;
  const [state, formAction] = useActionState<StudentFormState, FormData>(action, {});
  const err = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={formAction} className="space-y-4">
      {studentId ? <input type="hidden" name="id" value={studentId} /> : null}

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
            <Field label="Email" htmlFor="email" error={err("email")} hint="Used to sign in.">
              <Input id="email" name="email" type="email" defaultValue={defaults?.email} required />
            </Field>
            <div className="flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" />
              <span>
                A temporary password (<code className="font-mono text-foreground">{DEMO_PASSWORD}</code>)
                will be set. The student should change it after first sign-in.
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
          <Field label="Gender" error={err("gender")}>
            <Select name="gender" defaultValue={defaults?.gender ?? "UNDISCLOSED"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(GENDER_LABELS) as Gender[]).map((g) => (
                  <SelectItem key={g} value={g}>
                    {GENDER_LABELS[g]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Date of birth" htmlFor="dateOfBirth" error={err("dateOfBirth")}>
            <Input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={defaults?.dateOfBirth} />
          </Field>
          <Field label="Blood group" error={err("bloodGroup")}>
            <Select name="bloodGroup" defaultValue={defaults?.bloodGroup ?? "UNKNOWN"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(BLOOD_GROUP_LABELS) as BloodGroup[]).map((b) => (
                  <SelectItem key={b} value={b}>
                    {BLOOD_GROUP_LABELS[b]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Phone" htmlFor="phone" error={err("phone")}>
            <Input id="phone" name="phone" defaultValue={defaults?.phone} />
          </Field>
          <Field label="Nationality" htmlFor="nationality" error={err("nationality")}>
            <Input id="nationality" name="nationality" defaultValue={defaults?.nationality ?? "Nepali"} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address" htmlFor="address" error={err("address")}>
              <Textarea id="address" name="address" defaultValue={defaults?.address} rows={2} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Academic</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Admission number"
            htmlFor="admissionNumber"
            error={err("admissionNumber")}
            hint={mode === "create" ? "Leave blank to auto-generate." : undefined}
          >
            <Input
              id="admissionNumber"
              name="admissionNumber"
              defaultValue={defaults?.admissionNumber}
              placeholder={suggestedAdmissionNumber}
            />
          </Field>
          <Field label="Roll number" htmlFor="rollNumber" error={err("rollNumber")}>
            <Input id="rollNumber" name="rollNumber" defaultValue={defaults?.rollNumber} />
          </Field>
          <Field label="Class & section" error={err("sectionId")} hint="Determines the school and enrollment.">
            <Select name="sectionId" defaultValue={defaults?.sectionId ?? "none"}>
              <SelectTrigger>
                <SelectValue placeholder="Select a section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {sectionOptions.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {mode === "edit" ? (
            <Field label="Status" error={err("status")}>
              <Select name="status" defaultValue={defaults?.status ?? "ACTIVE"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABELS) as EnrollmentStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="outline">
          <Link href={studentId ? `/dashboard/students/${studentId}` : "/dashboard/students"}>
            Cancel
          </Link>
        </Button>
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}
