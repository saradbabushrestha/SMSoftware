"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { initiateGatewayPaymentAction } from "@/lib/payments/actions";
import { formatNpr } from "@/lib/fees/display";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function GatewayButton({ gateway, label, bg }: { gateway: "ESEWA" | "KHALTI" | "FONEPAY"; label: string; bg: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="gateway"
      value={gateway}
      disabled={pending}
      style={{ backgroundColor: bg }}
      className="inline-flex min-w-32 flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </button>
  );
}

export function GatewayPayButtons({ invoiceId, balance }: { invoiceId: string; balance: number }) {
  const [amount, setAmount] = useState(String(Math.round(balance)));

  return (
    <form action={initiateGatewayPaymentAction} className="w-full space-y-3 sm:w-auto">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <div className="space-y-1.5">
        <Label htmlFor="pay-amount">Amount to pay (₨)</Label>
        <Input
          id="pay-amount"
          name="amount"
          type="number"
          min={1}
          max={Math.round(balance)}
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="sm:w-56"
          required
        />
        <p className="text-xs text-muted-foreground">Balance due: {formatNpr(balance)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <GatewayButton gateway="ESEWA" label="eSewa" bg="#60bb46" />
        <GatewayButton gateway="KHALTI" label="Khalti" bg="#5c2d91" />
        <GatewayButton gateway="FONEPAY" label="Fonepay" bg="#c1272d" />
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5" /> You’ll be redirected to the gateway to complete payment securely.
      </p>
    </form>
  );
}
