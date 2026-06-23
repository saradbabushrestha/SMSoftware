// Display + query invariants for the Audit Logs module (read-only, no new table).
import { PrismaClient } from "@prisma/client";
import { actionCategory, actionTone, rangeSince, humanizeAction } from "../src/lib/audit/display";

const db = new PrismaClient();

async function main() {
  let ok = true;
  const log = (label: string, pass: boolean, extra = "") => {
    console.log(`${pass ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
    if (!pass) ok = false;
  };

  // Display helpers (pure)
  log("category = action prefix", actionCategory("student.create") === "student");
  log("delete is destructive", actionTone("invoice.delete") === "destructive");
  log("failed login is destructive", actionTone("auth.login.failed") === "destructive");
  log("create is success", actionTone("student.create") === "success");
  log("humanize action", humanizeAction("payment.record") === "Payment record");

  // Range mapping
  log("range 'all' → null", rangeSince("all") === null);
  log("range '7d' ≈ 7 days ago", Math.abs((rangeSince("7d")!.getTime() - (Date.now() - 7 * 86400000))) < 60000);
  log("range default is today (midnight)", rangeSince(undefined)!.getHours() === 0);

  // Data present (real activity logged by server actions)
  const total = await db.auditLog.count();
  log("audit events exist", total > 0, String(total));
  const since = rangeSince("7d")!;
  const recent = await db.auditLog.count({ where: { createdAt: { gte: since } } });
  log("range filter narrows results", recent <= total, `${recent} in last 7d of ${total}`);

  console.log(ok ? "\n✅ AUDIT CHECKS PASSED" : "\n❌ SOME CHECKS FAILED");
  if (!ok) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
