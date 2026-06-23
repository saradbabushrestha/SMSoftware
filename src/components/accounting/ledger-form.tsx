"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { createLedgerAction, updateLedgerAction, type LedgerFormState } from "@/lib/accounting/actions";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "@/lib/accounting/display";
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

export interface LedgerFormDefaults {
  type?: "INCOME" | "EXPENSE";
  category?: string;
  amount?: string;
  date?: string;
  description?: string;
}

function Field({ label, htmlFor, error, children }: { label: string; htmlFor?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Save />}
      {mode === "create" ? "Add entry" : "Save changes"}
    </Button>
  );
}

export function LedgerForm({
  mode,
  defaults,
  defaultDate,
  entryId,
}: {
  mode: "create" | "edit";
  defaults?: LedgerFormDefaults;
  defaultDate?: string;
  entryId?: string;
}) {
  const action = mode === "create" ? createLedgerAction : updateLedgerAction;
  const [state, formAction] = useActionState<LedgerFormState, FormData>(action, {});
  const err = (n: string) => state.fieldErrors?.[n];

  const [type, setType] = useState<"INCOME" | "EXPENSE">(defaults?.type ?? "EXPENSE");
  const suggestions = type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <form action={formAction} className="space-y-4">
      {entryId ? <input type="hidden" name="id" value={entryId} /> : null}

      {state.error ? (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <Field label="Type" error={err("type")}>
            <Select name="type" value={type} onValueChange={(v) => setType(v as "INCOME" | "EXPENSE")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCOME">Income</SelectItem>
                <SelectItem value="EXPENSE">Expense</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Amount (₨)" htmlFor="amount" error={err("amount")}>
            <Input id="amount" name="amount" type="number" min={0} step="1" defaultValue={defaults?.amount} required />
          </Field>
          <Field label="Category" htmlFor="category" error={err("category")}>
            <Input id="category" name="category" list="ledger-categories" defaultValue={defaults?.category} placeholder="e.g. Salaries" required />
            <datalist id="ledger-categories">
              {suggestions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Date" htmlFor="date" error={err("date")}>
            <Input id="date" name="date" type="date" defaultValue={defaults?.date ?? defaultDate} required />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description" htmlFor="description" error={err("description")}>
              <Textarea id="description" name="description" defaultValue={defaults?.description} rows={2} placeholder="Optional note" />
            </Field>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="outline">
          <Link href="/dashboard/accounting">Cancel</Link>
        </Button>
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}
