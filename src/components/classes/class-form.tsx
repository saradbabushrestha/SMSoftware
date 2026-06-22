"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { createClassAction, updateClassAction, type ClassFormState } from "@/lib/classes/actions";
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

export interface ClassFormDefaults {
  name?: string;
  code?: string;
  stream?: string;
  capacity?: string;
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
      {mode === "create" ? "Create class" : "Save changes"}
    </Button>
  );
}

export function ClassForm({
  mode,
  schools,
  isSuperAdmin,
  defaults,
  classId,
}: {
  mode: "create" | "edit";
  schools: { id: string; name: string }[];
  isSuperAdmin: boolean;
  defaults?: ClassFormDefaults;
  classId?: string;
}) {
  const action = mode === "create" ? createClassAction : updateClassAction;
  const [state, formAction] = useActionState<ClassFormState, FormData>(action, {});
  const err = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={formAction} className="space-y-4">
      {classId ? <input type="hidden" name="id" value={classId} /> : null}

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
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          ) : null}

          <Field label="Class name" htmlFor="name" error={err("name")} hint="e.g. Grade 10">
            <Input id="name" name="name" defaultValue={defaults?.name} required />
          </Field>
          <Field label="Code" htmlFor="code" error={err("code")} hint="e.g. G10 (unique per school)">
            <Input id="code" name="code" defaultValue={defaults?.code} required />
          </Field>
          <Field label="Stream" htmlFor="stream" error={err("stream")} hint="Optional — e.g. Science">
            <Input id="stream" name="stream" defaultValue={defaults?.stream} />
          </Field>
          <Field label="Capacity" htmlFor="capacity" error={err("capacity")}>
            <Input
              id="capacity"
              name="capacity"
              type="number"
              min={1}
              max={2000}
              defaultValue={defaults?.capacity ?? "40"}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="outline">
          <Link href={classId ? `/dashboard/classes/${classId}` : "/dashboard/classes"}>Cancel</Link>
        </Button>
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}
