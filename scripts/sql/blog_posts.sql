-- ---------------------------------------------------------------------------
-- blog_posts — articles du blog immersio.ma
--
-- Remplace le Google Sheet lu via Apps Script. Les noms de colonnes suivent le
-- snake_case de la table `tours` ; la couche TypeScript fait la correspondance
-- vers le camelCase attendu par le site (voir lib/blog.ts).
--
-- À exécuter une fois dans Supabase → SQL Editor.
-- ---------------------------------------------------------------------------

create table if not exists public.blog_posts (
  id                uuid primary key default gen_random_uuid(),

  -- Identité et routage — intouchables après indexation par Google.
  -- slug est unique globalement, pas par langue : le site résout
  -- getPostBySlug(slug) sans connaître la locale.
  slug              text not null unique,
  language          text not null check (language in ('French', 'English')),

  -- Apparie les versions fr/en d'un même sujet. Alimente les balises hreflang
  -- et le champ x-default du sitemap : une valeur perdue met les deux versions
  -- en concurrence sur la même requête.
  linked_topic_id   text,

  -- Contenu
  name              text not null,
  excerpt           text,
  content_html      text,

  -- Présentation
  category          text,
  category_label    text,
  cover_image       text,
  image_alt         text,
  author_name       text,
  read_time         text,

  -- Référencement
  meta_title        text,
  meta_description  text,

  -- Publication
  status            text not null default 'Published',
  published_date    date,

  created_at        timestamptz not null default now(),

  -- Alimente lastModified du sitemap. Initialisé à published_date lors de la
  -- migration plutôt qu'à now(), pour ne pas déclarer à Google que les 60
  -- articles ont été modifiés le même jour.
  updated_at        timestamptz not null default now()
);

-- Liste publique : filtre sur langue + statut, tri par date.
create index if not exists blog_posts_lang_status_idx
  on public.blog_posts (language, status, published_date desc);

-- Résolution des paires fr/en.
create index if not exists blog_posts_linked_topic_idx
  on public.blog_posts (linked_topic_id);

-- Même posture que `tours` et `leads` : RLS actif sans policy publique.
-- Tout passe par la clé service_role côté serveur du dashboard ; aucune
-- lecture directe depuis un navigateur n'est possible.
alter table public.blog_posts enable row level security;
