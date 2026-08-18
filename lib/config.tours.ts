/**
 * Tours-specific configuration.
 *
 * Kept in a separate file from the main dashboard config on purpose:
 * the tours feature has its own deployment lifecycle and may be
 * enabled/disabled independently from the rest of the app.
 *
 * Wire this into its own API route or server component once the
 * feature is implemented; for now it exposes a typed accessor that
 * returns null until the env var is configured.
 */

export interface ToursConfig {
  readonly scriptUrl: string;
}

/**
 * Process.env key for the tours script.
 * Declared here (not in the main config's DashboardEnv) by design: the
 * tours feature has its own lifecycle and is intentionally decoupled.
 * When the feature is promoted to a first-class integration, promote
 * this key into DashboardEnv alongside the other script URLs.
 */
const TOURS_KEY = "TOURS_SCRIPT_URL" as const;

/**
 * Returns typed tours config if the env var is set, null otherwise.
 * Does NOT throw on absence: tours is optional infrastructure.
 */
export function getToursConfig(): ToursConfig | null {
  // Use the same "trim whitespace → null if empty" semantics as lib/config.ts
  // so behaviour stays consistent across optional integrations.
  const raw = process.env[TOURS_KEY];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  return { scriptUrl: trimmed };
}
