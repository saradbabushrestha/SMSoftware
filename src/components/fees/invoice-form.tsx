"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { FeeCategory } from "@prisma/client";
import { createInvoiceAction, updateInvoiceAction, type InvoiceFormState } from "@/lib/fees/actions";
import { FEE_CATEGORY_LABELS } from "@/lib/fees/display";
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

export interface InvoiceFormDefaults {
  studentId?: string;
  category?: FeeCategory;
  title?: string;
  amount?: string;
  dueDate?: string;
  note?: string;
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
      {mode === "create" ? "Create invoice" : "Save changes"}
    </Button>
  );
}

export function InvoiceForm({
  mode,
  studentOptions,
  defaults,
  invoiceId,
  lockedStudentLabel,
}: {
  mode: "create" | "edit";
  studentOptions: { id: string; label: string }[];
  defaults?: InvoiceFormDefaults;
  invoiceId?: string;
  lockedStudentLabel?: string; // shown (read-only) on edit instead of the picker
}) {
  const action = mode === "create" ? createInvoiceAction : updateInvoiceAction;
  const [state, formAction] = useActionState<InvoiceFormState, FormData>(action, {});
  const err = (n: string) => state.fieldErrors?.[n];

  return (
    <form action={formAction} className="space-y-4">
      {invoiceId ? <input type="hidden" name="id" value={invoiceId} /> : null}
      {mode === "edit" && defaults?.studentId ? <input type="hidden" name="studentId" value={defaults.studentId} /> : null}

      {state.error ? (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            {mode === "edit" ? (
              <Field label="Student">
                <Input value={lockedStudentLabel ?? ""} disabled />
              </Field>
            ) : (
              <Field label="Student" error={err("studentId")}>
                <Select name="studentId" defaultValue={defaults?.studentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {studentOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </div>

          <Field label="Category" error={err("category")}>
            <Select name="category" defaultValue={defaults?.category ?? "TUITION"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FEE_CATEGORY_LABELS) as FeeCategory[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {FEE_CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Amount (₨)" htmlFor="amount" error={err("amount")}>
            <Input id="amount" name="amount" type="number" min={1} step="1" defaultValue={defaults?.amount} required />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Title" htmlFor="title" error={err("title")} hint="e.g. Tuition fee — Term 1">
              <Input id="title" name="title" defaultValue={defaults?.title} required />
            </Field>
          </div>
          <Field label="Due date" htmlFor="dueDate" error={err("dueDate")}>
            <Input id="dueDate" name="dueDate" type="date" defaultValue={defaults?.dueDate} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Note" htmlFor="note" error={err("note")}>
              <Textarea id="note" name="note" defaultValue={defaults?.note} rows={2} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="outline">
          <Link href={invoiceId ? `/dashboard/fees/${invoiceId}` : "/dashboard/fees"}>Cancel</Link>
        </Button>
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}
