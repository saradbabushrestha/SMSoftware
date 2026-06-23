import "server-only";
import { db } from "@/lib/db";
import type { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

export async function getSubscription(schoolId: string) {
  return db.subscription.findUnique({ where: { schoolId } });
}

/** Seats consumed = active (non-deleted) user accounts in the school. */
export async function getSeatsUsed(schoolId: string): Promise<number> {
  return db.user.count({ where: { schoolId, deletedAt: null } });
}

export async function getSubscriptionPanel(schoolId: string) {
  const [subscription, seatsUsed] = await Promise.all([getSubscription(schoolId), getSeatsUsed(schoolId)]);
  return { subscription, seatsUsed };
}

/** Plan/status keyed by schoolId — for badges on the schools list. */
export async function getSubscriptionsFor(schoolIds: string[]): Promise<Map<string, { plan: SubscriptionPlan; status: SubscriptionStatus }>> {
  if (schoolIds.length === 0) return new Map();
  const rows = await db.subscription.findMany({
    where: { schoolId: { in: schoolIds } },
    select: { schoolId: true, plan: true, status: true },
  });
  return new Map(rows.map((r) => [r.schoolId, { plan: r.plan, status: r.status }]));
}
