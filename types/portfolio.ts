/**
 * types/portfolio.ts — Domain types for the portfolio.
 *
 * `PortfolioProject` mirrors the payload immersio.ma already consumes, so the
 * site's components need no change. What does change is how a project is
 * addressed: by (slug, language), not by slug alone — four projects share a
 * slug across languages, and the old API had no way to tell them apart.
 */

export type PortfolioLanguage = "French" | "English";

/** Row as stored. */
export interface PortfolioProjectRecord {
  id: string;
  slug: string;
  language: PortfolioLanguage;
  linked_topic_id: string | null;
  name: string;
  description_html: string | null;
  city: string | null;
  sector: string | null;
  surface: string | null;
  delivery_time: string | null;
  cover_image: string | null;
  embed_url: string | null;
  deliverables: string[];
  meta_title: string | null;
  meta_description: string | null;
  status: string;
  published_at: string | null;
  /** Lead (client) pour lequel le projet a été réalisé — null si non lié. */
  lead_id?: string | null;
  /** Soft-delete : true = retiré du dashboard et du site, conservé en base. */
  archived?: boolean;
  created_at: string;
  updated_at: string;
}

/** Public payload consumed by immersio.ma. */
export interface PortfolioProject {
  linkedTopicId: string;
  language: PortfolioLanguage;
  name: string;
  slug: string;
  city: string;
  sector: string;
  surface: string;
  deliveryTime: string;
  coverImage: string;
  embedUrl: string;
  deliverables: string[];
  descriptionHtml: string;
  metaTitle: string;
  metaDescription: string;
  status: string;
  publishedAt: string | null;
  /** The other language's version, resolved from linkedTopicId. */
  linkedProject?: PortfolioProject | null;
}

/**
 * Entry of the `portfolio_slugs` action — feeds sitemap.xml.
 *
 * `linkedTopicId` was empty on every row in the Google Sheet, which is why the
 * sitemap emitted no fr/en alternates at all. It is populated here.
 */
export interface PortfolioSlugEntry {
  slug: string;
  language: PortfolioLanguage;
  linkedTopicId: string;
  /**
   * Real modification timestamp, feeding <lastmod> in the sitemap. The site
   * previously stamped new Date() there, telling Google on every crawl that
   * all 14 projects had just changed — a freshness signal it learns to ignore.
   */
  last_edited_time: string;
}

export type PortfolioProjectInsert = Omit<
  PortfolioProjectRecord,
  "id" | "created_at" | "updated_at"
> &
  Partial<Pick<PortfolioProjectRecord, "created_at" | "updated_at">>;

export type PortfolioProjectUpdate = Partial<
  Omit<PortfolioProjectRecord, "id" | "created_at">
>;

import { SECTEURS } from "./vocabulaire";

/**
 * Sector values used by the site's filters and labels.
 * Derived from the shared vocabulary — same slugs on immersio.ma's portfolio
 * filters, the contact form and the tours module.
 */
export const PORTFOLIO_SECTORS: ReadonlyArray<{ value: string; label: string }> = SECTEURS.map(
  (s) => ({ value: s.value, label: s.fr })
);

export type PortfolioSector = string;
