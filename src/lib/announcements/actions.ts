"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/rbac/authorize";
import { audit } from "@/lib/audit";
import { announcementSchema, formToObject } from "@/lib/announcements/validation";

export interface AnnouncementFormState {
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

export async function createAnnouncementAction(_prev: AnnouncementFormState, formData: FormData): Promise<AnnouncementFormState> {
  const user = await requireUser();
  if (!can(user, "announcement:manage")) return { error: "You don't have permission to post announcements." };
  if (!user.schoolId) return { error: "Switch to a specific school to post an announcement." };

  const parsed = announcementSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const d = parsed.data;

  const a = await db.announcement.create({
    data: {
      schoolId: user.schoolId,
      title: d.title,
      body: d.body,
      audience: d.audience,
      pinned: d.pinned,
      expiresAt: d.expiresAt ?? null,
      authorId: user.id,
    },
  });
  await audit({ action: "announcement.create", userId: user.id, schoolId: user.schoolId, entityType: "Announcement", entityId: a.id, metadata: { audience: d.audience } });

  revalidatePath("/dashboard/announcements");
  redirect(`/dashboard/announcements/${a.id}`);
}

export async function updateAnnouncementAction(_prev: AnnouncementFormState, formData: FormData): Promise<AnnouncementFormState> {
  const user = await requireUser();
  if (!can(user, "announcement:manage")) return { error: "You don't have permission to manage announcements." };

  const id = String(formData.get("id") ?? "");
  const existing = await db.announcement.findFirst({ where: { id, deletedAt: null, ...scope(user) } });
  if (!existing) return { error: "Announcement not found." };

  const parsed = announcementSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const d = parsed.data;

  await db.announcement.update({
    where: { id },
    data: { title: d.title, body: d.body, audience: d.audience, pinned: d.pinned, expiresAt: d.expiresAt ?? null },
  });
  await audit({ action: "announcement.update", userId: user.id, schoolId: existing.schoolId, entityType: "Announcement", entityId: id });

  revalidatePath("/dashboard/announcements");
  revalidatePath(`/dashboard/announcements/${id}`);
  redirect(`/dashboard/announcements/${id}`);
}

export async function togglePinAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "announcement:manage")) return;

  const id = String(formData.get("id") ?? "");
  const existing = await db.announcement.findFirst({ where: { id, deletedAt: null, ...scope(user) } });
  if (!existing) return;

  await db.announcement.update({ where: { id }, data: { pinned: !existing.pinned } });
  await audit({ action: "announcement.pin", userId: user.id, schoolId: existing.schoolId, entityType: "Announcement", entityId: id, metadata: { pinned: !existing.pinned } });

  revalidatePath("/dashboard/announcements");
  revalidatePath(`/dashboard/announcements/${id}`);
}

export async function deleteAnnouncementAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "announcement:manage")) return;

  const id = String(formData.get("id") ?? "");
  const existing = await db.announcement.findFirst({ where: { id, deletedAt: null, ...scope(user) } });
  if (!existing) return;

  await db.announcement.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ action: "announcement.delete", userId: user.id, schoolId: existing.schoolId, entityType: "Announcement", entityId: id });

  revalidatePath("/dashboard/announcements");
  redirect("/dashboard/announcements");
}
