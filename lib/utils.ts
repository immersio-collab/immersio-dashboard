/**
 * lib/ — reusable utilities.
 * Placeholder module to assert the folder exists and export a small
 * deterministic helper that is safe to import from anywhere.
 */

/**
 * Join truthy class names into a single string.
 * Intentionally tiny; replace with a library if/when approved.
 */
export function cn(...args: Array<string | false | null | undefined>): string {
  return args.filter(Boolean).join(" ");
}
