"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CreditCard, Loader2, Info } from "lucide-react";
import type { PaymentMethod } from "@prisma/client";
import { recordPaymentAction, type PaymentState } from "@/lib/fees/actions";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_OPTIONS, ONLINE_METHODS, formatNpr } from "@/lib/fees/display";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <CreditCard />}
      {label}
    </Button>
  );
}

function PaymentForm({
  invoiceId,
  balance,
  methods,
  online,
  onSuccess,
}: {
  invoiceId: string;
  balance: number;
  methods: PaymentMethod[];
  online: boolean;
  onSuccess: () => void;
}) {
  const [state, formAction] = useActionState<PaymentState, FormData>(recordPaymentAction, {});
  useEffect(() => {
    if (state.ok) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="invoiceId" value={invoiceId} />

      {state.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="pay-amount">Amount (₨)</Label>
        <Input id="pay-amount" name="amount" type="number" min={1} step="1" defaultValue={Math.round(balance)} required />
        {state.fieldErrors?.amount ? <p className="text-xs text-destructive">{state.fieldErrors.amount}</p> : null}
        <p className="text-xs text-muted-foreground">Balance due: {formatNpr(balance)}</p>
      </div>

      <div className="space-y-1.5">
        <Label>Payment method</Label>
        <Select name="method" defaultValue={methods[0]}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {methods.map((m) => (
              <SelectItem key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!online ? (
        <div className="space-y-1.5">
          <Label htmlFor="pay-ref">Reference / receipt no. (optional)</Label>
          <Input id="pay-ref" name="reference" placeholder="e.g. cheque or receipt number" />
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>Demo gateway (eSewa / Khalti / Fonepay) — records a successful payment with a generated reference; no real charge.</span>
        </div>
      )}

      <DialogFooter>
        <SubmitButton label={online ? "Pay now" : "Record payment"} />
      </DialogFooter>
    </form>
  );
}

export function RecordPaymentDialog({
  invoiceId,
  balance,
  canManage,
}: {
  invoiceId: string;
  balance: number;
  canManage: boolean; // staff (all methods) vs parent (online only)
}) {
  const [open, setOpen] = useState(false);
  const methods = canManage ? PAYMENT_METHOD_OPTIONS : ONLINE_METHODS;

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <CreditCard /> {canManage ? "Record payment" : "Pay now"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{canManage ? "Record a payment" : "Pay invoice"}</DialogTitle>
          </DialogHeader>
          {/* Mounted only while open → useActionState resets each time */}
          {open ? (
            <PaymentForm
              invoiceId={invoiceId}
              balance={balance}
              methods={methods}
              online={!canManage}
              onSuccess={() => setOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
