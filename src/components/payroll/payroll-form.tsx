"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { createPayrollAction, updatePayrollAction, type PayrollFormState } from "@/lib/payroll/actions";
import { computeNetPay, formatNpr } from "@/lib/payroll/display";
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

export interface PayrollFormDefaults {
  teacherId?: string;
  month?: string;
  basicSalary?: string;
  allowances?: string;
  deductions?: string;
  tax?: string;
  note?: string;
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
      {mode === "create" ? "Create payslip" : "Save changes"}
    </Button>
  );
}

export function PayrollForm({
  mode,
  teachers,
  defaults,
  defaultMonth,
  payrollId,
}: {
  mode: "create" | "edit";
  teachers: { id: string; label: string }[];
  defaults?: PayrollFormDefaults;
  defaultMonth?: string;
  payrollId?: string;
}) {
  const action = mode === "create" ? createPayrollAction : updatePayrollAction;
  const [state, formAction] = useActionState<PayrollFormState, FormData>(action, {});
  const err = (n: string) => state.fieldErrors?.[n];

  const [basic, setBasic] = useState(defaults?.basicSalary ?? "");
  const [allow, setAllow] = useState(defaults?.allowances ?? "0");
  const [ded, setDed] = useState(defaults?.deductions ?? "0");
  const [tax, setTax] = useState(defaults?.tax ?? "0");
  const net = computeNetPay(Number(basic) || 0, Number(allow) || 0, Number(ded) || 0, Number(tax) || 0);

  return (
    <form action={formAction} className="space-y-4">
      {payrollId ? <input type="hidden" name="id" value={payrollId} /> : null}

      {state.error ? (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <Field label="Teacher" error={err("teacherId")}>
            <Select name="teacherId" defaultValue={defaults?.teacherId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a teacher" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Month" htmlFor="month" error={err("month")}>
            <Input id="month" name="month" type="month" defaultValue={defaults?.month ?? defaultMonth} required />
          </Field>
          <Field label="Basic salary (₨)" htmlFor="basicSalary" error={err("basicSalary")}>
            <Input id="basicSalary" name="basicSalary" type="number" min={0} step="1" value={basic} onChange={(e) => setBasic(e.target.value)} required />
          </Field>
          <Field label="Allowances (₨)" htmlFor="allowances" error={err("allowances")}>
            <Input id="allowances" name="allowances" type="number" min={0} step="1" value={allow} onChange={(e) => setAllow(e.target.value)} />
          </Field>
          <Field label="Deductions (₨)" htmlFor="deductions" error={err("deductions")}>
            <Input id="deductions" name="deductions" type="number" min={0} step="1" value={ded} onChange={(e) => setDed(e.target.value)} />
          </Field>
          <Field label="Tax (₨)" htmlFor="tax" error={err("tax")}>
            <Input id="tax" name="tax" type="number" min={0} step="1" value={tax} onChange={(e) => setTax(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Note" htmlFor="note" error={err("note")}>
              <Textarea id="note" name="note" defaultValue={defaults?.note} rows={2} />
            </Field>
          </div>
          <div className="flex items-center justify-between rounded-md border bg-muted/40 px-4 py-3 sm:col-span-2">
            <span className="text-sm font-medium text-muted-foreground">Net pay</span>
            <span className="text-lg font-semibold">{formatNpr(net)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="outline">
          <Link href={payrollId ? `/dashboard/payroll/${payrollId}` : "/dashboard/payroll"}>Cancel</Link>
        </Button>
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}
