import { NextRequest, NextResponse } from "next/server";
import { rotateSession } from "@/lib/auth/session";

export const runtime = "nodejs";

/** Only allow same-app relative redirect targets (prevents open redirects). */
function safePath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

async function handle(req: NextRequest) {
  const target = safePath(req.nextUrl.searchParams.get("redirect"));
  const ok = await rotateSession();
  const dest = ok ? target : "/login";
  return NextResponse.redirect(new URL(dest, req.nextUrl.origin));
}

export const GET = handle;
export const POST = handle;
