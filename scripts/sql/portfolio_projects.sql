-- ---------------------------------------------------------------------------
-- portfolio_projects — projets du portfolio immersio.ma
--
-- Remplace le Google Sheet lu via Apps Script, et corrige trois defauts que
-- lancienne API rendait inevitables :
--
--   1. Le slug seul ne peut pas identifier un projet : quatre projets portent
--      le meme slug en francais et en anglais. Lancien endpoint ne prenait pas
--      de parametre de langue, donc /fr/portfolio/appartement-luxe-rabat
--      servait la fiche anglaise. Do la cle unique (slug, language).
--
--   2. linked_topic_id etait vide sur les 14 projets, donc lappariement fr/en
--      tombait toujours sur le premier enregistrement : les pages declaraient
--      a Google une traduction francaise sans rapport.
--
--   3. Le sitemap nemettait aucun alternate fr/en, pour la meme raison.
--
-- Note : commentaires volontairement sans apostrophes. Loutil
-- "Run and enable RLS" de Supabase reecrit la requete cote client sans tenir
-- compte des commentaires, et une apostrophe y casse lanalyse.
--
-- A executer une fois dans Supabase, SQL Editor.
-- ---------------------------------------------------------------------------

create table if not exists public.portfolio_projects (
  id                uuid primary key default gen_random_uuid(),

  -- Identite et routage. Le slug est unique uniquement par langue.
  slug              text not null,
  language          text not null check (language in ('French', 'English')),

  -- Apparie les deux versions dun meme projet. Renseigne a la migration a
  -- partir de lappariement reconstruit (secteur, image, visite 3D).
  linked_topic_id   text,

  -- Contenu
  name              text not null,
  description_html  text,

  -- Caracteristiques du projet
  city              text,
  sector            text,
  surface           text,
  delivery_time     text,
  cover_image       text,
  embed_url         text,

  -- Livrables : tableau de chaines. jsonb plutot que text[] pour que lAPI les
  -- renvoie tels quels au site, qui les consomme deja comme un tableau JSON.
  deliverables      jsonb not null default '[]'::jsonb,

  -- Referencement
  meta_title        text,
  meta_description  text,

  -- Publication
  status            text not null default 'Published',
  published_at      date,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- LA correction du bug de langue.
  unique (slug, language)
);

-- Liste publique : filtre langue et statut, tri par date.
create index if not exists portfolio_lang_status_idx
  on public.portfolio_projects (language, status, published_at desc);

-- Resolution des paires fr/en (hreflang, sitemap).
create index if not exists portfolio_linked_topic_idx
  on public.portfolio_projects (linked_topic_id);

-- Meme posture que tours, leads et blog_posts : RLS actif sans policy
-- publique, tout passe par la cle service_role cote serveur du dashboard.
alter table public.portfolio_projects enable row level security;
