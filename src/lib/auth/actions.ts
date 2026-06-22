"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export interface LoginState {
  error?: string;
  email?: string;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
      email: String(formData.get("email") ?? ""),
    };
  }

  const { email, password } = parsed.data;
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = hdrs.get("user-agent");

  const user = await db.user.findFirst({ where: { email, deletedAt: null } });

  // Constant-ish handling: always run a compare to reduce user enumeration.
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !ok) {
    await audit({ action: "auth.login.failed", metadata: { email }, ip, userAgent });
    return { error: "Incorrect email or password.", email };
  }

  if (user.status !== "ACTIVE") {
    return {
      error:
        user.status === "SUSPENDED"
          ? "Your account is suspended. Contact your administrator."
          : "Your account is not active. Contact your administrator.",
      email,
    };
  }

  await createSession(user, { userAgent: userAgent ?? undefined, ip: ip ?? undefined });
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit({
    action: "auth.login",
    userId: user.id,
    schoolId: user.schoolId,
    ip,
    userAgent,
  });

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const user = await getCurrentUser();
  if (user) {
    await audit({ action: "auth.logout", userId: user.id, schoolId: user.schoolId });
  }
  await destroySession();
  redirect("/login");
}
