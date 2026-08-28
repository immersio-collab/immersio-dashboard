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
/**
 * Posts a set of cache tags to the site's revalidation endpoint.
 *
 * Shared by every content type: the site does not care which table a tag came
 * from, only which cache entries to drop.
 */
async function revalidateTags(rawTags: ReadonlyArray<string>): Promise<void> {
  const config = getRevalidateConfig();
  if (!config) {
    console.warn(
      `[revalidate] ${ENDPOINT_KEY} / ${SECRET_KEY} not set — skipping site revalidation.`
    );
    return;
  }

  // Deduped with indexOf rather than a Set spread: tsconfig targets ES5 here
  // and iterating a Set would need downlevelIteration.
  const tags = rawTags.filter((tag, i, all) => tag && all.indexOf(tag) === i);
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

/**
 * Asks immersio.ma to invalidate the cached pages for the given tour slugs.
 *
 * A slug rename touches two pages: the URL that just disappeared and the one
 * that just appeared. Callers pass both.
 */
export async function revalidateTours(
  slugs: ReadonlyArray<string | null | undefined>
): Promise<void> {
  await revalidateTags(
    slugs
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .map(tourTag)
  );
}

/**
 * Cache tags the site attaches to its blog fetches.
 * Must stay in sync with src/lib/blog-api.ts on immersio.ma.
 */
export function blogTags(slug?: string | null): string[] {
  // "blog" backs the index and any listing; the per-slug tag backs the article
  // page. An edit touches both — the card in the list carries the title too.
  const tags = ["blog"];
  const clean = slug?.trim();
  if (clean) tags.push(`blog-${clean}`);
  return tags;
}

/**
 * Asks immersio.ma to drop its cached blog pages for the given slugs.
 *
 * Same contract as revalidateTours: never throws, awaited by callers so the
 * request is not frozen mid-flight by the platform.
 */
export async function revalidateBlog(
  slugs: ReadonlyArray<string | null | undefined>
): Promise<void> {
  // revalidateTags dedupes, so no Set is needed here (ES5 target).
  await revalidateTags(slugs.flatMap((s) => blogTags(s)));
}
