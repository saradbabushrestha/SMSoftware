import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { UserRole } from "@prisma/client";

const enc = new TextEncoder();

function accessSecret() {
  const s = process.env.JWT_ACCESS_SECRET;
  if (!s) throw new Error("JWT_ACCESS_SECRET is not set");
  return enc.encode(s);
}

export const ACCESS_COOKIE = "sms_access";
export const REFRESH_COOKIE = "sms_refresh";

export interface AccessClaims extends JWTPayload {
  sub: string; // user id
  role: UserRole;
  schoolId: string | null;
  email: string;
}

export interface AccessTokenInput {
  sub: string;
  role: UserRole;
  schoolId: string | null;
  email: string;
}

const ACCESS_TTL = process.env.JWT_ACCESS_TTL || "15m";

/** Mint a signed, short-lived access token. */
export async function signAccessToken({
  sub,
  role,
  schoolId,
  email,
}: AccessTokenInput): Promise<string> {
  return new SignJWT({ role, schoolId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(accessSecret());
}

/** Verify an access token; returns claims or null if invalid/expired. */
export async function verifyAccessToken(token: string): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify<AccessClaims>(token, accessSecret());
    return payload;
  } catch {
    return null;
  }
}

/** Seconds the access token is valid (used for cookie maxAge). */
export function accessMaxAgeSeconds(): number {
  return parseDuration(ACCESS_TTL);
}

export function refreshMaxAgeSeconds(): number {
  return parseDuration(process.env.JWT_REFRESH_TTL || "30d");
}

/** Parse simple durations like "15m", "30d", "12h", "45s" into seconds. */
function parseDuration(value: string): number {
  const m = /^(\d+)([smhd])$/.exec(value.trim());
  if (!m) return Number(value) || 0;
  const n = Number(m[1]);
  const unit = m[2];
  const mult = unit === "s" ? 1 : unit === "m" ? 60 : unit === "h" ? 3600 : 86400;
  return n * mult;
}
