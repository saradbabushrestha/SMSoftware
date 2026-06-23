"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { can, requireUser } from "@/lib/rbac/authorize";
import { audit } from "@/lib/audit";
import { payrollSchema, formToObject } from "@/lib/payroll/validation";
import { computeNetPay } from "@/lib/payroll/display";

export interface PayrollFormState {
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

export async function createPayrollAction(_prev: PayrollFormState, formData: FormData): Promise<PayrollFormState> {
  const user = await requireUser();
  if (!can(user, "payroll:manage")) return { error: "You don't have permission to run payroll." };

  const parsed = payrollSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const d = parsed.data;

  const teacher = await db.teacher.findFirst({ where: { id: d.teacherId, deletedAt: null, ...scope(user) } });
  if (!teacher) return { fieldErrors: { teacherId: "Select a valid teacher." } };

  const netPay = computeNetPay(d.basicSalary, d.allowances, d.deductions, d.tax);

  let newId: string;
  try {
    const rec = await db.payrollRecord.create({
      data: { schoolId: teacher.schoolId, teacherId: teacher.id, month: d.month, basicSalary: d.basicSalary, allowances: d.allowances, deductions: d.deductions, tax: d.tax, netPay, note: d.note },
    });
    newId = rec.id;
    await audit({ action: "payroll.create", userId: user.id, schoolId: teacher.schoolId, entityType: "PayrollRecord", entityId: rec.id, metadata: { month: d.month, netPay } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "This teacher already has a payslip for that month." };
    }
    throw e;
  }

  revalidatePath("/dashboard/payroll");
  redirect(`/dashboard/payroll/${newId}`);
}

export async function updatePayrollAction(_prev: PayrollFormState, formData: FormData): Promise<PayrollFormState> {
  const user = await requireUser();
  if (!can(user, "payroll:manage")) return { error: "You don't have permission to run payroll." };

  const id = String(formData.get("id") ?? "");
  const existing = await db.payrollRecord.findFirst({ where: { id, ...scope(user) } });
  if (!existing) return { error: "Payslip not found." };
  if (existing.status === "PAID") return { error: "A paid payslip can't be edited." };

  const parsed = payrollSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error) };
  const d = parsed.data;
  const netPay = computeNetPay(d.basicSalary, d.allowances, d.deductions, d.tax);

  try {
    await db.payrollRecord.update({
      where: { id },
      data: { teacherId: d.teacherId, month: d.month, basicSalary: d.basicSalary, allowances: d.allowances, deductions: d.deductions, tax: d.tax, netPay, note: d.note },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "That teacher already has a payslip for that month." };
    }
    throw e;
  }
  await audit({ action: "payroll.update", userId: user.id, schoolId: existing.schoolId, entityType: "PayrollRecord", entityId: id });

  revalidatePath("/dashboard/payroll");
  revalidatePath(`/dashboard/payroll/${id}`);
  redirect(`/dashboard/payroll/${id}`);
}

export async function markPaidAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "payroll:manage")) return;

  const id = String(formData.get("id") ?? "");
  const existing = await db.payrollRecord.findFirst({ where: { id, ...scope(user) } });
  if (!existing || existing.status === "PAID") return;

  await db.payrollRecord.update({ where: { id }, data: { status: "PAID", paidAt: new Date() } });
  await audit({ action: "payroll.paid", userId: user.id, schoolId: existing.schoolId, entityType: "PayrollRecord", entityId: id });

  revalidatePath("/dashboard/payroll");
  revalidatePath(`/dashboard/payroll/${id}`);
}

export async function deletePayrollAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "payroll:manage")) return;

  const id = String(formData.get("id") ?? "");
  const existing = await db.payrollRecord.findFirst({ where: { id, ...scope(user) } });
  if (!existing) return;

  await db.payrollRecord.delete({ where: { id } });
  await audit({ action: "payroll.delete", userId: user.id, schoolId: existing.schoolId, entityType: "PayrollRecord", entityId: id });

  revalidatePath("/dashboard/payroll");
  redirect("/dashboard/payroll");
}
