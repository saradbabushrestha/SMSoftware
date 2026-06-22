import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, verifyAccessToken } from "@/lib/auth/jwt";

/** Paths that never require authentication. */
const PUBLIC_PATHS = new Set(["/login"]);

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  const hasRefresh = !!req.cookies.get(REFRESH_COOKIE)?.value;
  const claims = accessToken ? await verifyAccessToken(accessToken) : null;

  // Landing → route by auth state.
  if (pathname === "/") {
    return NextResponse.redirect(new URL(claims ? "/dashboard" : "/login", req.url));
  }

  // Public pages: bounce authenticated users away from the login screen.
  if (PUBLIC_PATHS.has(pathname)) {
    if (claims) return NextResponse.redirect(new URL("/dashboard", req.url));
    return NextResponse.next();
  }

  // Protected pages.
  if (claims) return NextResponse.next();

  // Access token missing/expired but a refresh token exists → silent refresh.
  if (hasRefresh) {
    const url = new URL("/api/auth/refresh", req.url);
    url.searchParams.set("redirect", pathname + search);
    return NextResponse.redirect(url);
  }

  // Fully unauthenticated → login (preserving intended destination).
  const loginUrl = new URL("/login", req.url);
  if (pathname !== "/dashboard") loginUrl.searchParams.set("next", pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run on everything except static assets and the auth API (which sets cookies).
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
