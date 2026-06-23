import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import type { PaymentGateway } from "@prisma/client";
import { db } from "@/lib/db";
import { getGateway } from "@/lib/payments/gateway";

function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function escapeAttr(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function autoSubmitForm(action: string, fields: Record<string, string>): string {
  const inputs = Object.entries(fields)
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${escapeAttr(String(v))}" />`)
    .join("");
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Redirecting…</title></head>
  <body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0">
    <form id="pg" method="POST" action="${escapeAttr(action)}">${inputs}</form>
    <p>Redirecting you to the payment gateway…</p>
    <noscript><button type="submit" form="pg">Continue</button></noscript>
    <script>document.getElementById("pg").submit();</script>
  </body>
</html>`;
}

/** Per-gateway URL the gateway should return the user to after checkout. */
function returnUrlFor(gateway: PaymentGateway, txnId: string): string {
  const base = appUrl();
  switch (gateway) {
    case "ESEWA":
      return `${base}/api/payments/esewa/callback/${txnId}`;
    case "KHALTI":
      return `${base}/api/payments/khalti/callback`;
    case "FONEPAY":
      return `${base}/api/payments/fonepay/callback/${txnId}`;
  }
}

/**
 * Shared handler for the per-gateway `/pay` routes: loads the PENDING
 * transaction, asks the gateway to initiate, persists any vendor reference,
 * then either renders the self-submitting form or redirects to hosted checkout.
 */
export async function handleInitiation(req: NextRequest, gateway: PaymentGateway): Promise<Response> {
  const txnId = req.nextUrl.searchParams.get("txn") ?? "";
  const txn = await db.paymentTransaction.findUnique({ where: { id: txnId } });
  if (!txn || txn.gateway !== gateway || txn.status !== "PENDING") {
    return NextResponse.redirect(new URL("/dashboard/fees?payment=error", req.url));
  }

  const invoice = await db.invoice.findUnique({
    where: { id: txn.invoiceId },
    include: { student: { include: { user: true } } },
  });
  const payer = txn.initiatedById
    ? await db.user.findUnique({ where: { id: txn.initiatedById }, select: { email: true, phone: true } })
    : null;

  const gw = getGateway(gateway);
  let result;
  try {
    result = await gw.pay(txn.amount, returnUrlFor(gateway, txn.id), txn.id, invoice?.title ?? "Invoice payment", {
      reference: txn.reference,
      failureUrl: `${appUrl()}/api/payments/esewa/callback/${txn.id}?status=failed`,
      customer: {
        name: invoice ? `${invoice.student.user.firstName} ${invoice.student.user.lastName}` : "Payer",
        email: payer?.email,
        phone: payer?.phone ?? undefined,
      },
    });
  } catch {
    await db.paymentTransaction.updateMany({ where: { id: txn.id, status: "PENDING" }, data: { status: "FAILED" } });
    return NextResponse.redirect(new URL(`/dashboard/fees/${txn.invoiceId}?payment=error`, req.url));
  }

  // Persist the vendor reference (e.g. Khalti pidx) when it differs.
  if (result.reference && result.reference !== txn.reference) {
    await db.paymentTransaction.update({ where: { id: txn.id }, data: { reference: result.reference } });
  }

  if (result.kind === "redirect") {
    return NextResponse.redirect(result.url);
  }
  return new NextResponse(autoSubmitForm(result.action, result.fields), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
