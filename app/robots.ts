import type { MetadataRoute } from "next";

/**
 * Le dashboard est un outil interne : aucune page ne doit être indexée.
 * Complété par `robots: { index: false }` dans app/layout.tsx — robots.txt
 * décourage le crawl, la balise interdit l'indexation des URLs déjà connues.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
