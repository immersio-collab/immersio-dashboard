/**
 * types/blog.ts — Domain types for the blog.
 *
 * `BlogPost` is deliberately shaped like the JSON the Google Apps Script used
 * to return, down to its redundant field pairs: immersio.ma consumes this
 * payload verbatim, and any reshaping here would be a change to the rendered
 * HTML of 60 indexed pages. The redundancy lives at the API boundary only —
 * the database stores one column per value (see scripts/sql/blog_posts.sql).
 */

export type BlogLanguage = "French" | "English";

/** Row as stored, before the API duplicates fields for the site's contract. */
export interface BlogPostRecord {
  id: string;
  slug: string;
  language: BlogLanguage;
  linked_topic_id: string | null;
  name: string;
  excerpt: string | null;
  content_html: string | null;
  category: string | null;
  category_label: string | null;
  cover_image: string | null;
  image_alt: string | null;
  author_name: string | null;
  read_time: string | null;
  meta_title: string | null;
  meta_description: string | null;
  status: string;
  published_date: string | null;
  /** Soft-delete : true = retiré du dashboard et du site, conservé en base. */
  archived?: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Public payload consumed by immersio.ma.
 *
 * `author`/`authorName`, `image`/`coverImage` and `date`/`publishedDate` are
 * the same value under two names. The site reads one of each depending on the
 * component, so both must ship.
 */
export interface BlogPost {
  name: string;
  slug: string;
  language: BlogLanguage;
  author: string;
  authorName: string;
  category: string;
  categoryLabel: string;
  excerpt: string;
  image: string;
  coverImage: string;
  imageAlt: string;
  readTime: string;
  metaTitle: string;
  metaDescription: string;
  linkedTopicId: string;
  date: string;
  publishedDate: string;
  status: string;
  contentHtml: string;
  linkedPost?: BlogPost | null;
}

/** Entry of the `slugs` action — feeds sitemap.xml and generateStaticParams. */
export interface BlogSlugEntry {
  slug: string;
  language: BlogLanguage;
  /**
   * Real modification timestamp, unlike the Apps Script which returned the
   * time of the request itself — telling Google all 60 posts had just changed,
   * on every crawl.
   */
  last_edited_time: string;
  linkedTopicId: string;
}

export type BlogPostInsert = Omit<BlogPostRecord, "id" | "created_at" | "updated_at"> &
  Partial<Pick<BlogPostRecord, "created_at" | "updated_at">>;

export type BlogPostUpdate = Partial<Omit<BlogPostRecord, "id" | "created_at">>;
