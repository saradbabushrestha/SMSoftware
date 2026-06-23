"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/rbac/authorize";
import { audit } from "@/lib/audit";
import { messageSchema, formToObject } from "@/lib/messages/validation";

export interface MessageFormState {
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

export async function sendMessageAction(_prev: MessageFormState, formData: FormData): Promise<MessageFormState> {
  const user = await requireUser();
  if (!can(user, "message:send")) return { error: "You don't have permission to send messages." };

  const parsed = messageSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const d = parsed.data;

  // Recipient must be an active user in the sender's school (any school for super admin).
  const recipientWhere: Prisma.UserWhereInput = { id: d.recipientId, deletedAt: null, status: "ACTIVE", NOT: { id: user.id } };
  if (user.role !== "SUPER_ADMIN") recipientWhere.schoolId = user.schoolId ?? "__none__";
  const recipient = await db.user.findFirst({ where: recipientWhere, select: { id: true, schoolId: true } });
  if (!recipient) return { fieldErrors: { recipientId: "Choose a valid recipient." } };

  const msg = await db.message.create({
    data: {
      schoolId: user.schoolId ?? recipient.schoolId ?? null,
      senderId: user.id,
      recipientId: recipient.id,
      subject: d.subject,
      body: d.body,
    },
  });
  await audit({ action: "message.send", userId: user.id, schoolId: msg.schoolId ?? undefined, entityType: "Message", entityId: msg.id });

  revalidatePath("/dashboard/messages");
  redirect(`/dashboard/messages/${msg.id}`);
}

/** Mark an inbox message read — no-op unless the caller is the recipient. */
export async function markMessageReadAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const res = await db.message.updateMany({
    where: { id, recipientId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  if (res.count > 0) revalidatePath("/dashboard/messages");
}

/** Remove a message from the caller's own box (per-side soft delete). */
export async function deleteMessageAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const msg = await db.message.findFirst({ where: { id, OR: [{ senderId: user.id }, { recipientId: user.id }] }, select: { id: true, senderId: true, recipientId: true } });
  if (!msg) return;

  const data = msg.recipientId === user.id ? { recipientDeletedAt: new Date() } : { senderDeletedAt: new Date() };
  await db.message.update({ where: { id: msg.id }, data });

  const box = msg.recipientId === user.id ? "inbox" : "sent";
  revalidatePath("/dashboard/messages");
  redirect(`/dashboard/messages?box=${box}`);
}
