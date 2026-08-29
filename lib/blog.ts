/**
 * lib/blog.ts — Server-only data access for the blog.
 *
 * Replaces the Google Apps Script endpoint immersio.ma used to read. The
 * payload shape is reproduced exactly, redundant fields included: 60 pages are
 * indexed against the HTML those fields render, so this layer is a port, not a
 * redesign. Improvements belong in a later, separate change.
 */

import { getSupabaseClient } from "@/lib/supabase";
import type {
  BlogPost,
  BlogPostRecord,
  BlogPostInsert,
  BlogPostUpdate,
  BlogSlugEntry,
  BlogLanguage,
} from "@/types";

export class BlogError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "BlogError";
  }
}

// Publication : voir lib/publication.ts. Un contenu « Published » daté du
// futur est programmé, pas en ligne — d'où onlyLive() plutôt qu'un simple
// filtre sur le statut.
import { onlyLive, todayISO, PUBLISHED } from "@/lib/publication";

/**
 * Turns a stored row into the payload the site expects.
 *
 * Nulls become empty strings because the Apps Script returned "" for blank
 * cells, and a component doing `post.excerpt.slice(...)` would throw on null.
 * The duplicated pairs (author/authorName, image/coverImage, date/publishedDate)
 * are the site's contract — different components read different names.
 */
function toPayload(row: BlogPostRecord): BlogPost {
  const authorName = row.author_name ?? "";
  const coverImage = row.cover_image ?? "";
  const publishedDate = row.published_date ?? "";

  return {
    name: row.name,
    slug: row.slug,
    language: row.language,
    author: authorName,
    authorName,
    category: row.category ?? "",
    categoryLabel: row.category_label ?? "",
    excerpt: row.excerpt ?? "",
    image: coverImage,
    coverImage,
    imageAlt: row.image_alt ?? "",
    readTime: row.read_time ?? "",
    metaTitle: row.meta_title ?? "",
    metaDescription: row.meta_description ?? "",
    linkedTopicId: row.linked_topic_id ?? "",
    date: publishedDate,
    publishedDate,
    status: row.status,
    contentHtml: row.content_html ?? "",
  };
}

async function selectRows(filter: (q: any) => any): Promise<BlogPostRecord[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await filter(supabase.from("blog_posts").select("*"));
  if (error) throw new BlogError(`Supabase error: ${error.message}`);
  // Soft-delete : les articles archivés n'existent plus pour l'application
  // (dashboard, API publique, sitemap). Filtré en JS et non dans la requête
  // pour fonctionner avant comme après la migration SQL créant la colonne.
  return ((data || []) as BlogPostRecord[]).filter((r) => !r.archived);
}

/**
 * Published posts for one language, newest first — the blog index.
 *
 * Tie-break on slug: several posts share a publication date, and Postgres
 * returns ties in physical order, which is not stable across queries. Without
 * this the "related posts" block would reshuffle between two identical builds.
 */
export async function getPublishedPosts(language: BlogLanguage): Promise<BlogPost[]> {
  const rows = await selectRows((q) =>
    onlyLive(q.eq("language", language), "published_date")
      .order("published_date", { ascending: false })
      .order("slug", { ascending: true })
  );
  return rows.map(toPayload);
}

/**
 * One published post, with its translation attached.
 *
 * The slug carries no language, so the lookup is global — slugs are unique
 * across both languages by database constraint. The paired post is resolved
 * from `linked_topic_id`; without it the site cannot emit hreflang, and the
 * French and English versions compete for the same query.
 */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const rows = await selectRows((q) =>
    onlyLive(q.eq("slug", slug.trim()), "published_date").limit(1)
  );
  const row = rows[0];
  if (!row) return null;

  const post = toPayload(row);

  if (row.linked_topic_id) {
    const siblings = await selectRows((q) =>
      onlyLive(q.eq("linked_topic_id", row.linked_topic_id), "published_date")
        .neq("language", row.language)
        .limit(1)
    );
    post.linkedPost = siblings[0] ? toPayload(siblings[0]) : null;
  } else {
    post.linkedPost = null;
  }

  return post;
}

/**
 * Slug index for sitemap.xml and generateStaticParams.
 *
 * `last_edited_time` is the row's real `updated_at`. The Apps Script generated
 * it per request, so every crawl was told all 60 posts had just been modified —
 * a freshness signal Google learns to ignore.
 */
export async function getAllSlugs(): Promise<BlogSlugEntry[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug, language, updated_at, linked_topic_id, archived")
    .eq("status", PUBLISHED)
    .or(`published_date.is.null,published_date.lte.${todayISO()}`);

  if (error) throw new BlogError(`Supabase error: ${error.message}`);

  // Un article archivé est une 404 publique : il doit disparaître du sitemap
  // et des alternates hreflang, pas seulement de la page elle-même.
  return (data || [])
    .filter((r: any) => !r.archived)
    .map((r: any) => ({
    slug: r.slug,
    language: r.language as BlogLanguage,
    last_edited_time: r.updated_at,
    linkedTopicId: r.linked_topic_id ?? "",
  }));
}

// ---------------------------------------------------------------------------
// Dashboard CRUD
// ---------------------------------------------------------------------------

/** Every post, drafts included — the dashboard list. */
export async function getAllPosts(): Promise<BlogPostRecord[]> {
  return selectRows((q) =>
    q.order("published_date", { ascending: false }).order("slug", { ascending: true })
  );
}

export async function getPostById(id: string): Promise<BlogPostRecord | null> {
  const rows = await selectRows((q) => q.eq("id", id).limit(1));
  return rows[0] ?? null;
}

export async function createPost(input: BlogPostInsert): Promise<BlogPostRecord> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .insert({ ...input, updated_at: new Date().toISOString() } as any)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new BlogError(`Un article avec le slug "${input.slug}" existe déjà.`, 409);
    }
    throw new BlogError(`Supabase error: ${error.message}`);
  }
  return data as BlogPostRecord;
}

/**
 * Updates a post and stamps `updated_at`.
 *
 * That stamp is what the sitemap reports to Google, so it must move only on a
 * real edit — never as a side effect of a migration or a bulk re-save.
 */
export async function updatePost(id: string, input: BlogPostUpdate): Promise<BlogPostRecord> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .update({ ...input, updated_at: new Date().toISOString() } as any)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new BlogError(`Un article avec le slug "${input.slug}" existe déjà.`, 409);
    }
    throw new BlogError(`Supabase error: ${error.message}`);
  }
  return data as BlogPostRecord;
}

/**
 * Archive un article (soft-delete) : conservé en base, retiré du dashboard,
 * du site et du sitemap. Décision du 29/08/2026 : « supprimer » = archiver.
 */
export async function archivePost(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("blog_posts")
    .update({ archived: true, updated_at: new Date().toISOString() } as any)
    .eq("id", id);
  if (error) throw new BlogError(`Supabase error: ${error.message}`);
}
