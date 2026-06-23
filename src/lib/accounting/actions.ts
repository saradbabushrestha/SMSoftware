"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/rbac/authorize";
import { audit } from "@/lib/audit";
import { ledgerSchema, formToObject } from "@/lib/accounting/validation";

export interface LedgerFormState {
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

type SessionUserT = Awaited<ReturnType<typeof requireUser>>;

function scope(user: SessionUserT) {
  return user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {};
}

export async function createLedgerAction(_prev: LedgerFormState, formData: FormData): Promise<LedgerFormState> {
  const user = await requireUser();
  if (!can(user, "accounting:manage")) return { error: "You don't have permission to manage accounting." };
  if (!user.schoolId) return { error: "Switch to a specific school to record ledger entries." };

  const parsed = ledgerSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const d = parsed.data;

  const entry = await db.ledgerEntry.create({
    data: {
      schoolId: user.schoolId,
      type: d.type,
      category: d.category,
      amount: d.amount,
      date: d.date,
      description: d.description,
      createdById: user.id,
    },
  });
  await audit({ action: "ledger.create", userId: user.id, schoolId: user.schoolId, entityType: "LedgerEntry", entityId: entry.id, metadata: { type: d.type, amount: d.amount } });

  revalidatePath("/dashboard/accounting");
  redirect("/dashboard/accounting");
}

export async function updateLedgerAction(_prev: LedgerFormState, formData: FormData): Promise<LedgerFormState> {
  const user = await requireUser();
  if (!can(user, "accounting:manage")) return { error: "You don't have permission to manage accounting." };

  const id = String(formData.get("id") ?? "");
  const existing = await db.ledgerEntry.findFirst({ where: { id, deletedAt: null, ...scope(user) } });
  if (!existing) return { error: "Ledger entry not found." };

  const parsed = ledgerSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const d = parsed.data;

  await db.ledgerEntry.update({
    where: { id },
    data: { type: d.type, category: d.category, amount: d.amount, date: d.date, description: d.description },
  });
  await audit({ action: "ledger.update", userId: user.id, schoolId: existing.schoolId, entityType: "LedgerEntry", entityId: id });

  revalidatePath("/dashboard/accounting");
  redirect("/dashboard/accounting");
}

export async function deleteLedgerAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "accounting:manage")) return;

  const id = String(formData.get("id") ?? "");
  const existing = await db.ledgerEntry.findFirst({ where: { id, deletedAt: null, ...scope(user) } });
  if (!existing) return;

  await db.ledgerEntry.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ action: "ledger.delete", userId: user.id, schoolId: existing.schoolId, entityType: "LedgerEntry", entityId: id });

  revalidatePath("/dashboard/accounting");
  redirect("/dashboard/accounting");
}
