// Data-layer invariants for Subscriptions — 1:1 mapping, seat usage, upsert, RBAC (super-only).
import { PrismaClient, type UserRole } from "@prisma/client";
import { getRolePermissions } from "../src/lib/rbac/permissions";
import { seatUsage } from "../src/lib/subscriptions/display";

const db = new PrismaClient();

async function main() {
  let ok = true;
  const log = (label: string, pass: boolean, extra = "") => {
    console.log(`${pass ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
    if (!pass) ok = false;
  };

  const greenwood = await db.school.findUniqueOrThrow({ where: { code: "GHS" } });
  const sunrise = await db.school.findUnique({ where: { code: "SAC" } });

  // Seeded subscriptions present + correct plans.
  const gSub = await db.subscription.findUnique({ where: { schoolId: greenwood.id } });
  log("Greenwood has a subscription", !!gSub);
  log("Greenwood is on Pro · Active", gSub?.plan === "PRO" && gSub?.status === "ACTIVE", `${gSub?.plan}/${gSub?.status}`);
  if (sunrise) {
    const sSub = await db.subscription.findUnique({ where: { schoolId: sunrise.id } });
    log("Sunrise tenant is on Trial · Trialing", sSub?.plan === "TRIAL" && sSub?.status === "TRIALING", `${sSub?.plan}/${sSub?.status}`);
  }

  // 1:1 — at most one subscription per school (schoolId is unique).
  const dupes = await db.subscription.groupBy({ by: ["schoolId"], _count: { _all: true }, having: { schoolId: { _count: { gt: 1 } } } });
  log("at most one subscription per school", dupes.length === 0);

  // Seat usage = active accounts vs seats.
  const used = await db.user.count({ where: { schoolId: greenwood.id, deletedAt: null } });
  const usage = seatUsage(used, gSub!.seats);
  log("seat usage computed from active accounts", used > 0 && usage.pct >= 0 && usage.pct <= 100, `${used}/${gSub!.seats} = ${usage.pct}%`);
  log("Greenwood is within its seat limit", !usage.over);
  // seatUsage tone math: over limit → destructive.
  const over = seatUsage(120, 100);
  log("over-limit usage flags destructive", over.over && over.tone === "destructive");

  // Upsert idempotency: re-running create-or-update doesn't duplicate.
  const before = await db.subscription.count({ where: { schoolId: greenwood.id } });
  await db.subscription.upsert({ where: { schoolId: greenwood.id }, update: { note: "touched" }, create: { schoolId: greenwood.id, plan: "PRO", status: "ACTIVE" } });
  const after = await db.subscription.count({ where: { schoolId: greenwood.id } });
  log("upsert updates in place (no duplicate row)", before === after && after === 1);
  await db.subscription.update({ where: { schoolId: greenwood.id }, data: { note: gSub!.note } });

  // RBAC: only super admin manages subscriptions.
  const roles: UserRole[] = ["SUPER_ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "TEACHER", "STUDENT", "PARENT", "ACCOUNTANT", "LIBRARIAN"];
  const managers = roles.filter((r) => getRolePermissions(r).includes("subscription:manage"));
  log("only super admin manages subscriptions", managers.join(",") === "SUPER_ADMIN", managers.join(","));

  console.log(ok ? "\n✅ SUBSCRIPTIONS DATA-LAYER CHECKS PASSED" : "\n❌ SOME CHECKS FAILED");
  if (!ok) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
