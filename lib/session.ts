/**
 * Signed session cookie management.
 *
 * Implementation notes:
 *   - Uses `jose` (JWT) with HS256 + the SESSION_SECRET env var to sign and
 *     verify a compact, self-contained session token.
 *   - Tokens expire after 30 days and are issued with an `iat` timestamp so
 *     the signature authenticates the creation date too.
 *   - Session payload is minimal: only a `sub` ("admin") so rotating the
 *     shared admin password can later be paired with a version bump or
 *     logout-via-secret-rotation if needed.
 *   - Cookie attributes: httpOnly, Secure in prod, SameSite=Lax, Path=/,
 *     MaxAge matching the JWT lifetime.
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { ensureConfig } from "@/lib/config";

/** Name of the signed session cookie. */
export const SESSION_COOKIE = "immersio_session";

/** How long sessions live — matches the 30-day requirement. */
export const SESSION_TTL_DAYS = 30;
const SESSION_TTL_SECONDS = SESSION_TTL_DAYS * 24 * 60 * 60;

/** Subject used in the JWT. Single admin user only. */
const SESSION_SUBJECT = "admin";

/** Algorithm. HS256 is simple and fast for single-secret deployments. */
const ALG = "HS256";

interface SessionPayload extends JWTPayload {
  sub: typeof SESSION_SUBJECT;
}

/**
 * Decodes the SESSION_SECRET env var into a CryptoKey-compatible form for jose.
 * Reads the config (thus validating required vars) on first call, cached.
 */
function getSigningKey(): Uint8Array {
  const cfg = ensureConfig();
  const secret = cfg.SESSION_SECRET;
  // Use UTF-8 bytes; any charset works as long as we are consistent.
  const bytes = new TextEncoder().encode(secret);
  if (bytes.length < 16) {
    // Hard safety net; user is told to use a strong secret but the app should
    // still fail loudly instead of using a weak HS256 key.
    throw new Error(
      "[immersio-dashboard] SESSION_SECRET must be at least 16 bytes. " +
        "Use a long random string (32+ chars recommended)."
    );
  }
  return bytes;
}

/**
 * Creates a new signed session token for the single admin user.
 * Returns the compact JWT string and its absolute expiry date (for cookie).
 */
export async function createSessionToken(): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const key = getSigningKey();
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = new Date((issuedAt + SESSION_TTL_SECONDS) * 1000);

  const token = await new SignJWT()
    .setProtectedHeader({ alg: ALG })
    .setSubject(SESSION_SUBJECT)
    .setIssuedAt(issuedAt)
    .setExpirationTime(`${SESSION_TTL_DAYS}d`)
    .sign(key);

  return { token, expiresAt };
}

/**
 * Verifies a session token. Returns `true` if the signature is valid, the
 * subject is the admin subject, and the token is within its validity window.
 * Any failure (tampering, expiry, wrong subject) returns `false`.
 */
export async function verifySessionToken(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const key = getSigningKey();
    const { payload } = await jwtVerify<SessionPayload>(token, key, {
      algorithms: [ALG],
      subject: SESSION_SUBJECT,
    });
    return typeof payload.exp === "number" && typeof payload.iat === "number";
  } catch {
    // Signature failures, expired tokens, malformed tokens, etc.
    return false;
  }
}

// --- Cookie helpers for App Router server code (Server Actions, RSC) -------

/**
 * Attaches the signed session cookie to the current response.
 * Safe to call from Server Actions and Route Handlers inside the App Router.
 */
export async function setSessionCookie(): Promise<void> {
  const { token, expiresAt } = await createSessionToken();
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Clears the signed session cookie. Used on logout. */
export function clearSessionCookie(): void {
  cookies().set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });
}

/**
 * Reads + verifies the session cookie from the current request (RSC / Action context).
 * Returns `true` when there is a valid admin session.
 */
export async function hasSessionCookie(): Promise<boolean> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}

// --- Cookie helpers for middleware (operates on request/response objects) ---

/**
 * Reads + verifies the session cookie from a NextRequest (middleware context).
 * Returns `true` when there is a valid admin session.
 */
export async function hasSessionOnRequest(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}

/**
 * Produces a NextResponse that clears the session cookie. Used by the
 * logout Server Action path (redirect variant).
 */
export function redirectWithClearedSession(url: string): NextResponse {
  const res = NextResponse.redirect(url, { status: 303 });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });
  return res;
}
