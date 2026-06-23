import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, can } from "@/lib/rbac/authorize";
import { PAYMENT_METHOD_LABELS } from "@/lib/fees/display";

function esc(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
const npr = (n: number) => `Rs ${Math.round(n).toLocaleString("en-US")}`;
const fmt = (d: Date) => d.toLocaleString("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

/** Student/parent may only see their own; staff (fee:view) see their school's. */
async function ownStudentIds(role: string, userId: string): Promise<string[] | undefined> {
  if (role === "STUDENT") {
    const s = await db.student.findFirst({ where: { userId, deletedAt: null }, select: { id: true } });
    return [s?.id ?? "__none__"];
  }
  if (role === "PARENT") {
    const g = await db.guardian.findFirst({ where: { userId, deletedAt: null }, include: { students: { select: { studentId: true } } } });
    const ids = g?.students.map((x) => x.studentId) ?? [];
    return ids.length ? ids : ["__none__"];
  }
  return undefined;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!can(user, "fee:view")) return new NextResponse("Forbidden", { status: 403 });

  const payment = await db.payment.findFirst({
    where: { id, ...(user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {}) },
    include: { invoice: { include: { student: { include: { user: true } } } }, school: true, recordedBy: true },
  });
  if (!payment) return new NextResponse("Not found", { status: 404 });

  const ownIds = await ownStudentIds(user.role, user.id);
  if (ownIds && !ownIds.includes(payment.invoice.studentId)) return new NextResponse("Forbidden", { status: 403 });

  const s = payment.invoice.student;
  const receiptNo = payment.id.slice(-10).toUpperCase();
  const rows: [string, string][] = [
    ["Student", `${s.user.firstName} ${s.user.lastName}`],
    ["Admission no.", s.admissionNumber],
    ["Invoice", payment.invoice.title],
    ["Payment method", PAYMENT_METHOD_LABELS[payment.method]],
    ["Reference", payment.reference ?? "—"],
    ["Date", fmt(payment.paidAt)],
    ["Received by", payment.recordedBy ? `${payment.recordedBy.firstName} ${payment.recordedBy.lastName}` : "Online (gateway)"],
  ];

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Receipt ${esc(receiptNo)}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background: #f4f4f5; color: #18181b; }
    .sheet { max-width: 640px; margin: 24px auto; background: #fff; border: 1px solid #e4e4e7; border-radius: 12px; padding: 40px; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #18181b; padding-bottom: 16px; margin-bottom: 24px; }
    .school { font-size: 20px; font-weight: 700; }
    .muted { color: #71717a; font-size: 13px; }
    h1 { font-size: 13px; letter-spacing: .12em; text-transform: uppercase; color: #71717a; margin: 0 0 4px; }
    .recno { font-family: ui-monospace, monospace; font-weight: 600; }
    .amount { margin: 24px 0; padding: 20px; background: #fafafa; border: 1px solid #e4e4e7; border-radius: 10px; text-align: center; }
    .amount .lbl { font-size: 12px; color: #71717a; }
    .amount .val { font-size: 32px; font-weight: 700; letter-spacing: -.02em; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 9px 0; font-size: 14px; border-bottom: 1px solid #f0f0f1; }
    td.k { color: #71717a; width: 42%; }
    td.v { font-weight: 500; text-align: right; }
    .paid { display: inline-block; margin-top: 4px; padding: 3px 10px; border-radius: 999px; background: #dcfce7; color: #166534; font-size: 12px; font-weight: 600; }
    .foot { margin-top: 28px; text-align: center; color: #a1a1aa; font-size: 12px; }
    .actions { max-width: 640px; margin: 0 auto 24px; text-align: right; }
    button { font: inherit; cursor: pointer; border: 1px solid #18181b; background: #18181b; color: #fff; padding: 9px 16px; border-radius: 8px; font-weight: 600; }
    @media print { body { background: #fff; } .sheet { border: none; margin: 0; max-width: none; } .actions { display: none; } }
  </style>
</head>
<body>
  <div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
  <div class="sheet">
    <div class="head">
      <div>
        <div class="school">${esc(payment.school.name)}</div>
        <div class="muted">${esc(payment.school.address ?? payment.school.city ?? "")}</div>
      </div>
      <div style="text-align:right">
        <h1>Payment Receipt</h1>
        <div class="recno">#${esc(receiptNo)}</div>
        <div class="paid">PAID</div>
      </div>
    </div>
    <div class="amount">
      <div class="lbl">Amount paid</div>
      <div class="val">${esc(npr(payment.amount))}</div>
    </div>
    <table>
      ${rows.map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td class="v">${esc(v)}</td></tr>`).join("")}
    </table>
    <p class="foot">This is a computer-generated receipt and does not require a signature.</p>
  </div>
</body>
</html>`;

  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
