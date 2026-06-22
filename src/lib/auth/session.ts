import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessMaxAgeSeconds,
  refreshMaxAgeSeconds,
  signAccessToken,
  verifyAccessToken,
} from "@/lib/auth/jwt";
import { getRolePermissions, type PermissionKey } from "@/lib/rbac/permissions";
import type { SessionUser } from "@/lib/auth/types";

export type { SessionUser };

const isProd = process.env.NODE_ENV === "production";

function baseCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

/** Compute effective permissions: role defaults + per-user overrides. */
async function resolvePermissions(user: Pick<User, "id" | "role">): Promise<PermissionKey[]> {
  const rolePerms = new Set<string>(getRolePermissions(user.role));
  const overrides = await db.userPermission.findMany({
    where: { userId: user.id },
    include: { permission: true },
  });
  for (const o of overrides) {
    if (o.granted) rolePerms.add(o.permission.key);
    else rolePerms.delete(o.permission.key);
  }
  return [...rolePerms] as PermissionKey[];
}

/**
 * Create a brand-new session for a user: issue an access token + a rotating
 * refresh token, persist the refresh token (hashed), and set both cookies.
 * Must be called from a Server Action or Route Handler (cookie write context).
 */
export async function createSession(
  user: Pick<User, "id" | "email" | "role" | "schoolId">,
  ctx?: { userAgent?: string; ip?: string },
): Promise<void> {
  const jar = await cookies();

  const access = await signAccessToken({
    sub: user.id,
    role: user.role,
    schoolId: user.schoolId ?? null,
    email: user.email,
  });

  const refresh = randomBytes(48).toString("hex");
  const refreshMaxAge = refreshMaxAgeSeconds();
  await db.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(refresh),
      userAgent: ctx?.userAgent,
      ip: ctx?.ip,
      expiresAt: new Date(Date.now() + refreshMaxAge * 1000),
    },
  });

  jar.set(ACCESS_COOKIE, access, baseCookieOptions(accessMaxAgeSeconds()));
  jar.set(REFRESH_COOKIE, refresh, baseCookieOptions(refreshMaxAge));
}

/**
 * Validate the refresh cookie against the DB, rotate it, and mint a fresh
 * access token. Returns true on success. Used by the refresh route handler.
 */
export async function rotateSession(): Promise<boolean> {
  const jar = await cookies();
  const presented = jar.get(REFRESH_COOKIE)?.value;
  if (!presented) return false;

  const record = await db.refreshToken.findUnique({
    where: { tokenHash: sha256(presented) },
    include: { user: true },
  });

  if (
    !record ||
    record.revokedAt ||
    record.expiresAt.getTime() < Date.now() ||
    record.user.deletedAt ||
    record.user.status !== "ACTIVE"
  ) {
    await clearSession();
    return false;
  }

  // Rotate: revoke the presented token, issue a new one.
  const next = randomBytes(48).toString("hex");
  const refreshMaxAge = refreshMaxAgeSeconds();
  await db.$transaction([
    db.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    }),
    db.refreshToken.create({
      data: {
        userId: record.userId,
        tokenHash: sha256(next),
        userAgent: record.userAgent,
        ip: record.ip,
        expiresAt: new Date(Date.now() + refreshMaxAge * 1000),
      },
    }),
  ]);

  const access = await signAccessToken({
    sub: record.user.id,
    role: record.user.role,
    schoolId: record.user.schoolId ?? null,
    email: record.user.email,
  });

  jar.set(ACCESS_COOKIE, access, baseCookieOptions(accessMaxAgeSeconds()));
  jar.set(REFRESH_COOKIE, next, baseCookieOptions(refreshMaxAge));
  return true;
}

/** Revoke the current refresh token (if any) and clear auth cookies. */
export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const presented = jar.get(REFRESH_COOKIE)?.value;
  if (presented) {
    await db.refreshToken
      .updateMany({
        where: { tokenHash: sha256(presented), revokedAt: null },
        data: { revokedAt: new Date() },
      })
      .catch(() => undefined);
  }
  await clearSession();
}

async function clearSession() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

/**
 * Resolve the current authenticated user from the access cookie.
 * Returns null when unauthenticated. (Token refresh is handled in middleware.)
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  const claims = await verifyAccessToken(token);
  if (!claims?.sub) return null;

  const user = await db.user.findFirst({
    where: { id: claims.sub, deletedAt: null, status: "ACTIVE" },
  });
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    schoolId: user.schoolId,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    permissions: await resolvePermissions(user),
  };
}
