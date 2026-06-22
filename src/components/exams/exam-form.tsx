"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { ExamType } from "@prisma/client";
import { createExamAction, updateExamAction, type ExamFormState } from "@/lib/exams/actions";
import { EXAM_TYPE_LABELS } from "@/lib/exams/grading";
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

export interface ExamFormDefaults {
  name?: string;
  type?: ExamType;
  classId?: string;
  maxMarks?: string;
  examDate?: string;
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
      {mode === "create" ? "Create exam" : "Save changes"}
    </Button>
  );
}

export function ExamForm({
  mode,
  classOptions,
  defaults,
  examId,
}: {
  mode: "create" | "edit";
  classOptions: { id: string; label: string }[];
  defaults?: ExamFormDefaults;
  examId?: string;
}) {
  const action = mode === "create" ? createExamAction : updateExamAction;
  const [state, formAction] = useActionState<ExamFormState, FormData>(action, {});
  const err = (n: string) => state.fieldErrors?.[n];

  return (
    <form action={formAction} className="space-y-4">
      {examId ? <input type="hidden" name="id" value={examId} /> : null}

      {state.error ? (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Exam name" htmlFor="name" error={err("name")} hint="e.g. Mid-Term Examination 2024">
              <Input id="name" name="name" defaultValue={defaults?.name} required />
            </Field>
          </div>
          <Field label="Type" error={err("type")}>
            <Select name="type" defaultValue={defaults?.type ?? "MIDTERM"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(EXAM_TYPE_LABELS) as ExamType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {EXAM_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Class" error={err("classId")}>
            <Select name="classId" defaultValue={defaults?.classId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Maximum marks" htmlFor="maxMarks" error={err("maxMarks")}>
            <Input id="maxMarks" name="maxMarks" type="number" min={1} max={1000} defaultValue={defaults?.maxMarks ?? "100"} />
          </Field>
          <Field label="Exam date" htmlFor="examDate" error={err("examDate")}>
            <Input id="examDate" name="examDate" type="date" defaultValue={defaults?.examDate} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="outline">
          <Link href={examId ? `/dashboard/exams/${examId}` : "/dashboard/exams"}>Cancel</Link>
        </Button>
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}
