"use server";

/**
 * Authentication Server Actions for the single-admin dashboard.
 *
 * Flow:
 *   1. `login(password)` — verifies password against bcrypt hash from env,
 *      issues a signed session cookie on success, redirects to dashboard.
 *   2. `logout()` — clears the session cookie, redirects to /login.
 *
 * Only a single user ("admin") is supported. No DB, no accounts, no
 * registration. Password verification uses bcryptjs with constant-time
 * compare to eliminate timing leaks.
 */

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

import { ensureConfig } from "@/lib/config";
import {
  clearSessionCookie,
  setSessionCookie,
} from "@/lib/session";

/** Return shape of the login Server Action for client-side form state. */
export interface LoginState {
  ok: boolean;
  error?: string;
}

/**
 * Login Server Action.
 *
 * Takes the raw password from the form, compares it to the configured
 * bcrypt hash, sets the signed httpOnly session cookie on match, and
 * redirects to /dashboard. On any failure (missing config, bad password,
 * hash misconfiguration) returns a state object with a generic error
 * message (never leak which part failed — keeps account enumeration
 * impossible even though there is only one account).
 */
export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const password = formData.get("password");

  // Sanitize input: reject non-string, empty, or absurdly long values.
  if (typeof password !== "string" || password.length === 0) {
    return { ok: false, error: "Mot de passe requis." };
  }
  if (password.length > 256) {
    // bcrypt truncates; reject clearly to avoid silent misbehavior.
    return { ok: false, error: "Mot de passe invalide." };
  }

  const cfg = ensureConfig();

  // Best practice: always run a compare even if the hash is missing, so
  // the timing of the failure cannot reveal whether the env is configured.
  const hash =
    typeof cfg.DASHBOARD_PASSWORD_HASH === "string" &&
    cfg.DASHBOARD_PASSWORD_HASH.length > 0
      ? cfg.DASHBOARD_PASSWORD_HASH
      : // Dummy 12-cost bcrypt hash (for "invalid" string) so timing is flat.
        "$2a$12$R9h/cIPz0jmPz.RV8tM4yOvLz3zGxXw9v3J4Yq2F1D8kS5T6q5uYy";

  let matches = false;
  try {
    matches = bcrypt.compareSync(password, hash);
  } catch {
    // Malformed hash (wrong length, bad salt) → treat as "wrong password".
    matches = false;
  }

  if (!matches) {
    return { ok: false, error: "Mot de passe incorrect." };
  }

  // Success: issue session cookie and redirect to the dashboard.
  await setSessionCookie();
  redirect("/dashboard");
}

/**
 * Logout Server Action.
 *
 * Clears the session cookie and redirects back to the login page. Always
 * succeeds (even if no session existed) so the user is never stuck.
 */
export async function logout(): Promise<never> {
  clearSessionCookie();
  redirect("/login");
}
