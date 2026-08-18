/**
 * Dashboard access control middleware.
 *
 * Protects every route under `/dashboard` by requiring a valid signed
 * `immersio_session` cookie. Invalid or missing cookie → 307 redirect to
 * /login with a `next` query parameter so the login form can send the
 * user back where they started.
 *
 * Notes:
 *   - Runs at the Edge (no Node APIs used, just jose + NextRequest/Response).
 *   - `ensureConfig` is intentionally NOT called from middleware: the
 *     session verification path calls `getSigningKey` which validates the
 *     config lazily only if a cookie is actually present. No cookie means
 *     we fast-path the redirect without reading env.
 *   - All non-dashboard routes (/, /login, /api, static assets) are
 *     untouched; the matcher is exact.
 */

import { NextResponse, type NextRequest } from "next/server";

import { hasSessionOnRequest, SESSION_COOKIE } from "@/lib/session";

export const config = {
  // Protect everything under /dashboard, including subroutes.
  matcher: "/dashboard/:path*",
};

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const hasSession = await hasSessionOnRequest(req);

  if (hasSession) {
    // Session valid: proceed to the protected route.
    return NextResponse.next();
  }

  // Missing or invalid session: redirect to /login.
  // Preserve the original path in the `next` query param so after a
  // successful login the action can redirect the user straight through.
  const loginUrl = new URL("/login", req.nextUrl.origin);
  if (req.nextUrl.pathname !== "/dashboard") {
    loginUrl.searchParams.set(
      "next",
      req.nextUrl.pathname + req.nextUrl.search
    );
  }
  const res = NextResponse.redirect(loginUrl, { status: 307 });
  // Clear a broken cookie if one existed, so the browser won't keep
  // re-sending a known-bad signature on every subsequent request.
  if (req.cookies.has(SESSION_COOKIE)) {
    res.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
      maxAge: 0,
    });
  }
  return res;
}
