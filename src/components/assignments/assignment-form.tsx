"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { createAssignmentAction, updateAssignmentAction, type AssignmentFormState } from "@/lib/assignments/actions";
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

export interface AssignmentFormDefaults {
  sectionId?: string;
  subjectId?: string;
  title?: string;
  description?: string;
  dueDate?: string; // yyyy-MM-ddTHH:mm
  maxPoints?: string;
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
      {mode === "create" ? "Create assignment" : "Save changes"}
    </Button>
  );
}

export function AssignmentForm({
  mode,
  sections,
  subjects,
  defaults,
  assignmentId,
}: {
  mode: "create" | "edit";
  sections: { id: string; label: string }[];
  subjects: { id: string; label: string }[];
  defaults?: AssignmentFormDefaults;
  assignmentId?: string;
}) {
  const action = mode === "create" ? createAssignmentAction : updateAssignmentAction;
  const [state, formAction] = useActionState<AssignmentFormState, FormData>(action, {});
  const err = (n: string) => state.fieldErrors?.[n];

  return (
    <form action={formAction} className="space-y-4">
      {assignmentId ? <input type="hidden" name="id" value={assignmentId} /> : null}

      {state.error ? (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <Field label="Class & section" error={err("sectionId")}>
            <Select name="sectionId" defaultValue={defaults?.sectionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Subject" error={err("subjectId")}>
            <Select name="subjectId" defaultValue={defaults?.subjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Title" htmlFor="title" error={err("title")}>
              <Input id="title" name="title" defaultValue={defaults?.title} required />
            </Field>
          </div>
          <Field label="Due date" htmlFor="dueDate" error={err("dueDate")}>
            <Input id="dueDate" name="dueDate" type="datetime-local" defaultValue={defaults?.dueDate} required />
          </Field>
          <Field label="Max points" htmlFor="maxPoints" error={err("maxPoints")}>
            <Input id="maxPoints" name="maxPoints" type="number" min={1} max={1000} defaultValue={defaults?.maxPoints ?? "100"} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Instructions" htmlFor="description" error={err("description")}>
              <Textarea id="description" name="description" defaultValue={defaults?.description} rows={4} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="outline">
          <Link href={assignmentId ? `/dashboard/assignments/${assignmentId}` : "/dashboard/assignments"}>Cancel</Link>
        </Button>
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}
