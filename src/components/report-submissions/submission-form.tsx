"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2, Send } from "lucide-react";
import { submitReportAction, type SubmissionFormState } from "@/lib/report-submissions/actions";
import { REPORT_CATEGORIES } from "@/lib/report-submissions/display";
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

function Field({ label, htmlFor, error, children }: { label: string; htmlFor?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Send />}
      Submit for approval
    </Button>
  );
}

export function SubmissionForm() {
  const [state, formAction] = useActionState<SubmissionFormState, FormData>(submitReportAction, {});
  const err = (n: string) => state.fieldErrors?.[n];

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Title" htmlFor="title" error={err("title")}>
              <Input id="title" name="title" placeholder="e.g. Term 1 academic performance report" required />
            </Field>
          </div>
          <Field label="Category" error={err("category")}>
            <Select name="category" defaultValue={REPORT_CATEGORIES[0]}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Period (optional)" htmlFor="period" error={err("period")}>
            <Input id="period" name="period" placeholder="e.g. 2024 — Term 1" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Summary" htmlFor="summary" error={err("summary")}>
              <Textarea id="summary" name="summary" rows={8} placeholder="Findings, figures, and recommendations…" required />
            </Field>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="outline">
          <Link href="/dashboard/reports/submissions">Cancel</Link>
        </Button>
        <SubmitButton />
      </div>
    </form>
  );
}
