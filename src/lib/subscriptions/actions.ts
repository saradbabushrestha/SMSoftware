"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/rbac/authorize";
import { audit } from "@/lib/audit";
import { subscriptionSchema, formToObject } from "@/lib/subscriptions/validation";

export interface SubscriptionFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function zodToFieldErrors(error: import("zod").ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function upsertSubscriptionAction(_prev: SubscriptionFormState, formData: FormData): Promise<SubscriptionFormState> {
  const user = await requireUser();
  if (!can(user, "subscription:manage")) return { error: "You don't have permission to manage subscriptions." };

  const schoolId = String(formData.get("schoolId") ?? "");
  const school = await db.school.findFirst({ where: { id: schoolId, deletedAt: null } });
  if (!school) return { error: "School not found." };

  const parsed = subscriptionSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const d = parsed.data;

  const data = {
    plan: d.plan,
    status: d.status,
    seats: d.seats,
    priceNpr: d.priceNpr,
    renewsAt: d.renewsAt ?? null,
    note: d.note,
    updatedById: user.id,
  };

  await db.subscription.upsert({
    where: { schoolId },
    update: data,
    create: { schoolId, ...data },
  });
  await audit({ action: "subscription.update", userId: user.id, schoolId, entityType: "Subscription", entityId: schoolId, metadata: { plan: d.plan, status: d.status } });

  revalidatePath(`/dashboard/schools/${schoolId}`);
  revalidatePath("/dashboard/schools");
  redirect(`/dashboard/schools/${schoolId}`);
}
