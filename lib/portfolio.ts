/**
 * lib/portfolio.ts — Server-only data access for the portfolio.
 *
 * Replaces the Google Apps Script endpoint immersio.ma read, and fixes what
 * that API made impossible: a project is addressed by (slug, language), not by
 * slug alone. Four projects share a slug across languages, so the old
 * language-less lookup served the English record on French URLs.
 */

import { getSupabaseClient } from "@/lib/supabase";
import type {
  PortfolioProject,
  PortfolioProjectRecord,
  PortfolioProjectInsert,
  PortfolioProjectUpdate,
  PortfolioSlugEntry,
  PortfolioLanguage,
} from "@/types";

export class PortfolioError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "PortfolioError";
  }
}

const PUBLISHED = "Published";

/**
 * Normalises `deliverables`, stored as jsonb.
 *
 * Defensive because the column accepts any JSON: a hand-edited row could hold
 * a string or an object, and the site maps over this value directly.
 */
function toDeliverables(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [value];
    } catch {
      return [value];
    }
  }
  return [];
}

/** Turns a stored row into the payload the site expects. */
function toPayload(row: PortfolioProjectRecord): PortfolioProject {
  return {
    linkedTopicId: row.linked_topic_id ?? "",
    language: row.language,
    name: row.name,
    slug: row.slug,
    city: row.city ?? "",
    sector: row.sector ?? "",
    surface: row.surface ?? "",
    deliveryTime: row.delivery_time ?? "",
    coverImage: row.cover_image ?? "",
    embedUrl: row.embed_url ?? "",
    deliverables: toDeliverables(row.deliverables),
    descriptionHtml: row.description_html ?? "",
    metaTitle: row.meta_title ?? "",
    metaDescription: row.meta_description ?? "",
    status: row.status,
    publishedAt: row.published_at,
  };
}

async function selectRows(filter: (q: any) => any): Promise<PortfolioProjectRecord[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await filter(supabase.from("portfolio_projects").select("*"));
  if (error) throw new PortfolioError(`Supabase error: ${error.message}`);
  return (data || []) as PortfolioProjectRecord[];
}

/** Published projects for one language, newest first — the portfolio index. */
export async function getPublishedProjects(
  language: PortfolioLanguage
): Promise<PortfolioProject[]> {
  const rows = await selectRows((q) =>
    q
      .eq("language", language)
      .eq("status", PUBLISHED)
      .order("published_at", { ascending: false })
      // Tie-break: several projects share a date and Postgres returns ties in
      // physical order, which is not stable across queries.
      .order("slug", { ascending: true })
  );
  return rows.map(toPayload);
}

/**
 * One published project, with its translation attached.
 *
 * `language` is required, and that is the whole point: /fr/portfolio/fitness-club
 * and /en/our-work/fitness-club are different projects behind the same slug.
 * Making the parameter mandatory means no caller can reintroduce the bug.
 */
export async function getProjectBySlug(
  slug: string,
  language: PortfolioLanguage
): Promise<PortfolioProject | null> {
  const rows = await selectRows((q) =>
    q.eq("slug", slug.trim()).eq("language", language).eq("status", PUBLISHED).limit(1)
  );
  const row = rows[0];
  if (!row) return null;

  const project = toPayload(row);

  if (row.linked_topic_id) {
    const siblings = await selectRows((q) =>
      q
        .eq("linked_topic_id", row.linked_topic_id)
        .eq("status", PUBLISHED)
        .neq("language", row.language)
        .limit(1)
    );
    project.linkedProject = siblings[0] ? toPayload(siblings[0]) : null;
  } else {
    project.linkedProject = null;
  }

  return project;
}

/**
 * Slug index for sitemap.xml.
 *
 * `linkedTopicId` was empty on every row of the Google Sheet, so the sitemap
 * emitted no fr/en alternates and the pages advertised an unrelated project as
 * their translation. Populated here, both are correct.
 */
export async function getAllSlugs(): Promise<PortfolioSlugEntry[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("portfolio_projects")
    .select("slug, language, linked_topic_id, updated_at")
    .eq("status", PUBLISHED);

  if (error) throw new PortfolioError(`Supabase error: ${error.message}`);

  return (data || []).map((r: any) => ({
    slug: r.slug,
    language: r.language as PortfolioLanguage,
    linkedTopicId: r.linked_topic_id ?? "",
    last_edited_time: r.updated_at,
  }));
}

// ---------------------------------------------------------------------------
// Dashboard CRUD
// ---------------------------------------------------------------------------

export async function getAllProjects(): Promise<PortfolioProjectRecord[]> {
  return selectRows((q) =>
    q.order("published_at", { ascending: false }).order("slug", { ascending: true })
  );
}

export async function getProjectById(id: string): Promise<PortfolioProjectRecord | null> {
  const rows = await selectRows((q) => q.eq("id", id).limit(1));
  return rows[0] ?? null;
}

export async function createProject(
  input: PortfolioProjectInsert
): Promise<PortfolioProjectRecord> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("portfolio_projects")
    .insert({ ...input, updated_at: new Date().toISOString() } as any)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new PortfolioError(
        `Un projet "${input.slug}" existe déjà en ${input.language === "French" ? "français" : "anglais"}.`,
        409
      );
    }
    throw new PortfolioError(`Supabase error: ${error.message}`);
  }
  return data as PortfolioProjectRecord;
}

export async function updateProject(
  id: string,
  input: PortfolioProjectUpdate
): Promise<PortfolioProjectRecord> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("portfolio_projects")
    .update({ ...input, updated_at: new Date().toISOString() } as any)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new PortfolioError(`Ce couple slug / langue est déjà utilisé.`, 409);
    }
    throw new PortfolioError(`Supabase error: ${error.message}`);
  }
  return data as PortfolioProjectRecord;
}

export async function deleteProject(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("portfolio_projects").delete().eq("id", id);
  if (error) throw new PortfolioError(`Supabase error: ${error.message}`);
}
