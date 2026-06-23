"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/rbac/authorize";
import { audit } from "@/lib/audit";
import { routeSchema, assignSchema, formToObject } from "@/lib/transport/validation";

export interface RouteFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export interface AssignState {
  ok?: boolean;
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

function routeScope(user: SessionUserT) {
  return user.role !== "SUPER_ADMIN" ? { schoolId: user.schoolId ?? "__none__" } : {};
}

export async function createRouteAction(_prev: RouteFormState, formData: FormData): Promise<RouteFormState> {
  const user = await requireUser();
  if (!can(user, "transport:manage")) return { error: "You don't have permission to manage transport." };

  const parsed = routeSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };

  let schoolId = user.schoolId ?? undefined;
  if (user.role === "SUPER_ADMIN") {
    const sid = String(formData.get("schoolId") ?? "");
    const school = sid ? await db.school.findFirst({ where: { id: sid, deletedAt: null } }) : null;
    if (!school) return { fieldErrors: { schoolId: "Select a school." } };
    schoolId = school.id;
  }
  if (!schoolId) return { error: "No school associated with your account." };

  const route = await db.route.create({ data: { schoolId, ...parsed.data } });
  await audit({ action: "route.create", userId: user.id, schoolId, entityType: "Route", entityId: route.id, metadata: { name: parsed.data.name } });

  revalidatePath("/dashboard/transport");
  redirect(`/dashboard/transport/${route.id}`);
}

export async function updateRouteAction(_prev: RouteFormState, formData: FormData): Promise<RouteFormState> {
  const user = await requireUser();
  if (!can(user, "transport:manage")) return { error: "You don't have permission to manage transport." };

  const id = String(formData.get("id") ?? "");
  const existing = await db.route.findFirst({ where: { id, deletedAt: null, ...routeScope(user) } });
  if (!existing) return { error: "Route not found." };

  const parsed = routeSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };

  await db.route.update({ where: { id }, data: parsed.data });
  await audit({ action: "route.update", userId: user.id, schoolId: existing.schoolId, entityType: "Route", entityId: id });

  revalidatePath("/dashboard/transport");
  revalidatePath(`/dashboard/transport/${id}`);
  redirect(`/dashboard/transport/${id}`);
}

export async function deleteRouteAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "transport:manage")) return;

  const id = String(formData.get("id") ?? "");
  const existing = await db.route.findFirst({ where: { id, deletedAt: null, ...routeScope(user) } });
  if (!existing) return;

  await db.route.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ action: "route.delete", userId: user.id, schoolId: existing.schoolId, entityType: "Route", entityId: id });

  revalidatePath("/dashboard/transport");
  redirect("/dashboard/transport");
}

export async function assignStudentAction(_prev: AssignState, formData: FormData): Promise<AssignState> {
  const user = await requireUser();
  if (!can(user, "transport:manage")) return { error: "You don't have permission." };

  const routeId = String(formData.get("routeId") ?? "");
  const route = await db.route.findFirst({
    where: { id: routeId, deletedAt: null, ...routeScope(user) },
    include: { _count: { select: { assignments: true } } },
  });
  if (!route) return { error: "Route not found." };

  const parsed = assignSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const { studentId, stop } = parsed.data;

  const student = await db.student.findFirst({ where: { id: studentId, deletedAt: null, schoolId: route.schoolId } });
  if (!student) return { fieldErrors: { studentId: "Select a valid student from this school." } };

  // Capacity check (existing assignment elsewhere will move here).
  const already = await db.transportAssignment.findUnique({ where: { studentId } });
  if (!already && route.capacity > 0 && route._count.assignments >= route.capacity) {
    return { error: "This route is full." };
  }

  await db.transportAssignment.upsert({
    where: { studentId },
    update: { routeId, stop },
    create: { routeId, studentId, stop },
  });
  await audit({ action: "transport.assign", userId: user.id, schoolId: route.schoolId, entityType: "Route", entityId: routeId, metadata: { studentId } });

  revalidatePath(`/dashboard/transport/${routeId}`);
  revalidatePath("/dashboard/transport");
  return { ok: true };
}

export async function unassignStudentAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "transport:manage")) return;

  const assignmentId = String(formData.get("assignmentId") ?? "");
  const assignment = await db.transportAssignment.findFirst({
    where: { id: assignmentId, route: { deletedAt: null, ...routeScope(user) } },
    include: { route: true },
  });
  if (!assignment) return;

  await db.transportAssignment.delete({ where: { id: assignmentId } });
  await audit({ action: "transport.unassign", userId: user.id, schoolId: assignment.route.schoolId, entityType: "Route", entityId: assignment.routeId, metadata: { studentId: assignment.studentId } });

  revalidatePath(`/dashboard/transport/${assignment.routeId}`);
  revalidatePath("/dashboard/transport");
}
