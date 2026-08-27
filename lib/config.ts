/**
 * Typed access to environment variables for the Immersio dashboard.
 *
 * Centralises every process.env read so the rest of the codebase never
 * touches process.env directly. Validation of required variables runs
 * lazily on the first call that needs them (ensureConfig / getLeadsConfig)
 * so that static builds are not broken when .env.local holds empty
 * placeholder values. Once values are filled, you can wire ensureConfig()
 * into instrumentation.ts or a root dynamic layout for true boot-time
 * checks.
 *
 * Usage:
 *   import { env, ensureConfig, getLeadsConfig } from "@/lib/config";
 *
 * To add a new required variable:
 *   1. Add it to REQUIRED_KEYS in the ENV type below.
 *   2. Add it to .env.local.example and .env.local.
 *   3. Optionally expose a narrow getter (see getLeadsConfig).
 */

// --- Public shape of the environment we expose to the app --------------------

export interface DashboardEnv {
  readonly NEXT_PUBLIC_SUPABASE_URL: string;
  // Must be the secret service_role key to bypass RLS policies on the database.
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly DASHBOARD_PASSWORD_HASH: string;
  readonly SESSION_SECRET: string;

  // --- Future integrations (uncomment as they are implemented) -------------
  // These are declared optional so validation does not require them yet.
  // When you flip a feature on, move it above and make it required.
  readonly PORTFOLIO_SCRIPT_URL?: string;
  readonly BLOG_SCRIPT_URL?: string;
}

// Narrow view of the leads integration, consumed by the API route.
export interface SupabaseConfig {
  readonly supabaseUrl: string;
  readonly serviceRoleKey: string;
}

// Narrow view for future portfolio integration (enable when implemented).
export interface PortfolioConfig {
  readonly scriptUrl: string;
}

// Narrow view for future blog integration (enable when implemented).
export interface BlogConfig {
  readonly scriptUrl: string;
}

// --- Implementation ----------------------------------------------------------

type RequiredKey =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "DASHBOARD_PASSWORD_HASH"
  | "SESSION_SECRET";

type OptionalKey = "PORTFOLIO_SCRIPT_URL" | "BLOG_SCRIPT_URL";

const REQUIRED_KEYS: ReadonlyArray<RequiredKey> = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DASHBOARD_PASSWORD_HASH",
  "SESSION_SECRET",
];

const OPTIONAL_KEYS: ReadonlyArray<OptionalKey> = [
  "PORTFOLIO_SCRIPT_URL",
  "BLOG_SCRIPT_URL",
];

// Lazy module-level cache. `null` means not resolved yet.
let cached: DashboardEnv | null = null;

/**
 * Reads a string from process.env, trimming whitespace.
 * Returns undefined if the variable is not set, empty, or whitespace-only.
 */
function readEnv(key: RequiredKey | OptionalKey): string | undefined {
  const raw = process.env[key];
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

/**
 * Validates required variables are all present and throws a single clear
 * error listing every missing one. Designed to be loud at startup so
 * misconfigurations are caught immediately, not at request time on
 * random undefined values.
 */
function validate(
  resolved: Partial<Record<RequiredKey, string>>
): asserts resolved is Record<RequiredKey, string> {
  const missing: RequiredKey[] = REQUIRED_KEYS.filter(
    (key) => typeof resolved[key] !== "string" || resolved[key]!.length === 0
  );

  if (missing.length === 0) return;

  const list = missing.map((k) => `  - ${k}`).join("\n");
  throw new Error(
    `[immersio-dashboard] Missing required environment variable(s):\n${list}\n\n` +
      `Copy .env.local.example to .env.local and fill in the missing values.`
  );
}

/**
 * Resolves the full environment object and validates required keys.
 * Idempotent: subsequent calls return the same frozen instance.
 * Safe to call from API handlers and dynamic server components; throws
 * with a clear message as soon as the server needs the config, which is
 * effectively "at startup" for any real traffic.
 */
export function ensureConfig(): DashboardEnv {
  if (cached !== null) return cached;

  const requiredValues = REQUIRED_KEYS.reduce<
    Partial<Record<RequiredKey, string>>
  >((acc, key) => {
    const v = readEnv(key);
    if (v !== undefined) acc[key] = v;
    return acc;
  }, {});

  validate(requiredValues);

  const optionalValues = OPTIONAL_KEYS.reduce<
    Partial<Record<OptionalKey, string>>
  >((acc, key) => {
    const v = readEnv(key);
    if (v !== undefined) acc[key] = v;
    return acc;
  }, {});

  cached = Object.freeze({
    ...requiredValues,
    ...optionalValues,
  }) as DashboardEnv;

  return cached;
}

/**
 * Raw typed accessor to the validated environment.
 *
 * Each property is an explicit getter that resolves + validates the env on
 * its very first read. Subsequent reads hit the frozen cache. If any
 * required variable is missing, the first property access throws the
 * clear startup error.
 *
 * No Proxy, no dynamic property loops — fully compatible with TS strict
 * mode and every property is tracked by the type system (typos fail at
 * compile time, not runtime).
 */
let envInstance: DashboardEnv | undefined;

function resolve(): DashboardEnv {
  if (!envInstance) envInstance = ensureConfig();
  return envInstance;
}

export const env: DashboardEnv = {
  get NEXT_PUBLIC_SUPABASE_URL(): string {
    return resolve().NEXT_PUBLIC_SUPABASE_URL;
  },
  get SUPABASE_SERVICE_ROLE_KEY(): string {
    return resolve().SUPABASE_SERVICE_ROLE_KEY;
  },
  get DASHBOARD_PASSWORD_HASH(): string {
    return resolve().DASHBOARD_PASSWORD_HASH;
  },
  get SESSION_SECRET(): string {
    return resolve().SESSION_SECRET;
  },
  get PORTFOLIO_SCRIPT_URL(): string | undefined {
    return resolve().PORTFOLIO_SCRIPT_URL;
  },
  get BLOG_SCRIPT_URL(): string | undefined {
    return resolve().BLOG_SCRIPT_URL;
  },
};

// --- Convenience accessors grouped by integration ----------------------------

/**
 * Supabase integration config.
 */
export function getSupabaseConfig(): SupabaseConfig {
  const cfg = ensureConfig();
  return {
    supabaseUrl: cfg.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: cfg.SUPABASE_SERVICE_ROLE_KEY,
  };
}

/**
 * Portfolio integration config placeholder.
 * Enable once PORTFOLIO_SCRIPT_URL is promoted to a required variable.
 */
export function getPortfolioConfig(): PortfolioConfig | null {
  const url = env.PORTFOLIO_SCRIPT_URL;
  return url ? { scriptUrl: url } : null;
}

/**
 * Blog integration config placeholder.
 * Enable once BLOG_SCRIPT_URL is promoted to a required variable.
 */
export function getBlogConfig(): BlogConfig | null {
  const url = env.BLOG_SCRIPT_URL;
  return url ? { scriptUrl: url } : null;
}
