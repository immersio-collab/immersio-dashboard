/**
 * lib/revalidate.ts — On-demand ISR revalidation of the public site.
 *
 * When a tour changes here, immersio.ma must drop its cached copy of
 * /visite/[slug] immediately instead of waiting for the ISR window to
 * expire. The site exposes POST /api/revalidate, guarded by a shared
 * secret, which accepts cache tags to invalidate.
 *
 * Treated as optional infrastructure: reads process.env directly, returns
 * null when unconfigured, never throws. A missing configuration degrades to
 * the site's time-based ISR window — tours still propagate, just not
 * instantly — so the dashboard stays usable without it.
 */

const ENDPOINT_KEY = "SITE_REVALIDATE_URL" as const;
const SECRET_KEY = "REVALIDATION_SECRET" as const;

/**
 * Cache tag the site attaches to its per-tour fetch.
 * Must stay in sync with src/app/visite/[slug]/page.tsx on immersio.ma —
 * a mismatch here fails silently as "the page never refreshes".
 */
export function tourTag(slug: string): string {
  return `tour-${slug.trim().toLowerCase()}`;
}

interface RevalidateConfig {
  readonly endpoint: string;
  readonly secret: string;
}

function getRevalidateConfig(): RevalidateConfig | null {
  const endpoint = process.env[ENDPOINT_KEY]?.trim();
  const secret = process.env[SECRET_KEY]?.trim();
  if (!endpoint || !secret) return null;
  return { endpoint, secret };
}

/**
 * Asks immersio.ma to invalidate the cached pages for the given slugs.
 *
 * Never throws: the database write has already committed by the time this
 * runs, so a failed revalidation is a staleness problem, not a data problem.
 * It is logged and swallowed rather than turning a successful save into an
 * error the user cannot act on.
 *
 * Awaited by callers on purpose — Vercel may freeze the function once the
 * response is sent, so a detached promise would often never complete.
 */
export async function revalidateTours(
  slugs: ReadonlyArray<string | null | undefined>
): Promise<void> {
  const config = getRevalidateConfig();
  if (!config) {
    console.warn(
      `[revalidate] ${ENDPOINT_KEY} / ${SECRET_KEY} not set — skipping site revalidation.`
    );
    return;
  }

  // A slug rename touches two pages: the URL that just disappeared and the
  // one that just appeared. Callers pass both; dedupe and drop the empties.
  // Deduped with indexOf rather than a Set spread: tsconfig targets ES5 here
  // and iterating a Set would need downlevelIteration.
  const tags = slugs
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .map(tourTag)
    .filter((tag, i, all) => all.indexOf(tag) === i);
  if (tags.length === 0) return;

  try {
    const res = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-secret": config.secret,
      },
      body: JSON.stringify({ tags }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(
        `[revalidate] ${config.endpoint} → HTTP ${res.status}`,
        detail.slice(0, 200)
      );
      return;
    }

    console.log(`[revalidate] OK — ${tags.join(", ")}`);
  } catch (err) {
    console.error("[revalidate] Request failed:", err);
  }
}
