"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/rbac/authorize";
import { audit } from "@/lib/audit";
import { eventSchema, formToObject } from "@/lib/events/validation";

export interface EventFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export interface RegisterState {
  ok?: boolean;
  error?: string;
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

function eventScope(user: SessionUserT) {
  return user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {};
}

async function resolveSchoolId(user: SessionUserT, formData: FormData): Promise<string | null> {
  if (user.role === "SUPER_ADMIN") {
    const sid = String(formData.get("schoolId") ?? "");
    const school = sid ? await db.school.findFirst({ where: { id: sid, deletedAt: null } }) : null;
    return school?.id ?? null;
  }
  return user.schoolId ?? null;
}

export async function createEventAction(_prev: EventFormState, formData: FormData): Promise<EventFormState> {
  const user = await requireUser();
  if (!can(user, "event:manage")) return { error: "You don't have permission to manage events." };

  const parsed = eventSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const data = parsed.data;

  const schoolId = await resolveSchoolId(user, formData);
  if (!schoolId) return { fieldErrors: { schoolId: "Select a school." } };

  const event = await db.event.create({
    data: {
      schoolId,
      title: data.title,
      type: data.type,
      description: data.description,
      location: data.location,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      capacity: data.capacity,
      registrationOpen: formData.get("registrationOpen") === "on",
      createdById: user.id,
    },
  });
  await audit({ action: "event.create", userId: user.id, schoolId, entityType: "Event", entityId: event.id, metadata: { title: data.title } });

  revalidatePath("/dashboard/events");
  redirect(`/dashboard/events/${event.id}`);
}

export async function updateEventAction(_prev: EventFormState, formData: FormData): Promise<EventFormState> {
  const user = await requireUser();
  if (!can(user, "event:manage")) return { error: "You don't have permission to manage events." };

  const id = String(formData.get("id") ?? "");
  const existing = await db.event.findFirst({ where: { id, deletedAt: null, ...eventScope(user) } });
  if (!existing) return { error: "Event not found." };

  const parsed = eventSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const data = parsed.data;

  await db.event.update({
    where: { id },
    data: {
      title: data.title,
      type: data.type,
      description: data.description,
      location: data.location,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      capacity: data.capacity,
      registrationOpen: formData.get("registrationOpen") === "on",
    },
  });
  await audit({ action: "event.update", userId: user.id, schoolId: existing.schoolId, entityType: "Event", entityId: id });

  revalidatePath("/dashboard/events");
  revalidatePath(`/dashboard/events/${id}`);
  redirect(`/dashboard/events/${id}`);
}

export async function deleteEventAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "event:manage")) return;

  const id = String(formData.get("id") ?? "");
  const existing = await db.event.findFirst({ where: { id, deletedAt: null, ...eventScope(user) } });
  if (!existing) return;

  await db.event.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ action: "event.delete", userId: user.id, schoolId: existing.schoolId, entityType: "Event", entityId: id });

  revalidatePath("/dashboard/events");
  redirect("/dashboard/events");
}

export async function registerEventAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "event:view")) return;

  const id = String(formData.get("eventId") ?? "");
  const event = await db.event.findFirst({
    where: { id, deletedAt: null, ...eventScope(user) },
    include: { _count: { select: { registrations: true } } },
  });
  if (!event || !event.registrationOpen) return;
  if (event.capacity > 0 && event._count.registrations >= event.capacity) return; // full

  try {
    await db.eventRegistration.create({ data: { eventId: id, userId: user.id } });
    await audit({ action: "event.register", userId: user.id, schoolId: event.schoolId, entityType: "Event", entityId: id });
  } catch (e) {
    // Ignore duplicate registration (unique eventId+userId).
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
  }

  revalidatePath(`/dashboard/events/${id}`);
  revalidatePath("/dashboard/events");
}

export async function unregisterEventAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("eventId") ?? "");
  await db.eventRegistration
    .delete({ where: { eventId_userId: { eventId: id, userId: user.id } } })
    .catch(() => undefined);
  await audit({ action: "event.unregister", userId: user.id, entityType: "Event", entityId: id });

  revalidatePath(`/dashboard/events/${id}`);
  revalidatePath("/dashboard/events");
}
