"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2, Save, Info } from "lucide-react";
import { createSubjectAction, updateSubjectAction, type SubjectFormState } from "@/lib/subjects/actions";
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

export interface SubjectFormDefaults {
  name?: string;
  code?: string;
  credits?: string;
  classId?: string;
  teacherIds?: string[];
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
      {mode === "create" ? "Create subject" : "Save changes"}
    </Button>
  );
}

export function SubjectForm({
  mode,
  classOptions,
  teacherOptions,
  schools,
  isSuperAdmin,
  defaults,
  subjectId,
}: {
  mode: "create" | "edit";
  classOptions: { id: string; label: string }[];
  teacherOptions: { id: string; label: string }[];
  schools: { id: string; name: string }[];
  isSuperAdmin: boolean;
  defaults?: SubjectFormDefaults;
  subjectId?: string;
}) {
  const action = mode === "create" ? createSubjectAction : updateSubjectAction;
  const [state, formAction] = useActionState<SubjectFormState, FormData>(action, {});
  const err = (n: string) => state.fieldErrors?.[n];
  const selected = new Set(defaults?.teacherIds ?? []);
  const showTeachers = mode === "edit" || !isSuperAdmin;

  return (
    <form action={formAction} className="space-y-4">
      {subjectId ? <input type="hidden" name="id" value={subjectId} /> : null}

      {state.error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Subject details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {mode === "create" && isSuperAdmin ? (
            <Field label="School" error={err("schoolId")} hint="Used when no class is selected.">
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

          <Field label="Subject name" htmlFor="name" error={err("name")} hint="e.g. Mathematics">
            <Input id="name" name="name" defaultValue={defaults?.name} required />
          </Field>
          <Field label="Code" htmlFor="code" error={err("code")} hint="e.g. MATH (unique per school)">
            <Input id="code" name="code" defaultValue={defaults?.code} required />
          </Field>
          <Field label="Credits" htmlFor="credits" error={err("credits")}>
            <Input id="credits" name="credits" type="number" min={0} max={20} defaultValue={defaults?.credits ?? "1"} />
          </Field>
          <Field label="Class" error={err("classId")} hint="Leave school-wide or tie to a class.">
            <Select name="classId" defaultValue={defaults?.classId ?? "none"}>
              <SelectTrigger>
                <SelectValue placeholder="School-wide" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">School-wide</SelectItem>
                {classOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      {showTeachers ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Teachers</CardTitle>
          </CardHeader>
          <CardContent>
            {teacherOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No teachers available for this school yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {teacherOptions.map((t) => (
                  <label
                    key={t.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent has-[:checked]:border-primary/40 has-[:checked]:bg-primary/5"
                  >
                    <input
                      type="checkbox"
                      name="teacherIds"
                      value={t.id}
                      defaultChecked={selected.has(t.id)}
                      className="size-4 accent-[var(--primary)]"
                    />
                    {t.label}
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>You can assign teachers after creating the subject (edit it).</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="outline">
          <Link href={subjectId ? `/dashboard/subjects/${subjectId}` : "/dashboard/subjects"}>
            Cancel
          </Link>
        </Button>
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}
