-- ---------------------------------------------------------------------------
-- devis — devis generes depuis le dashboard
--
-- Remplace le Google Sheet alimente par immersio-devis.vercel.app. Les colonnes
-- reprennent les 21 champs du Sheet, plus un lien optionnel vers un lead et
-- l URL du PDF archive.
--
-- Note : commentaires sans apostrophes. L outil "Run and enable RLS" de
-- Supabase reecrit la requete cote client sans tenir compte des commentaires,
-- et une apostrophe y casse l analyse.
--
-- A executer une fois dans Supabase, SQL Editor.
-- ---------------------------------------------------------------------------

-- Numerotation atomique. Une sequence plutot quun max+1 calcule par l appli :
-- deux devis crees en meme temps ne peuvent pas recevoir le meme numero.
create sequence if not exists devis_number_seq start 1;

create table if not exists public.devis (
  id                uuid primary key default gen_random_uuid(),

  -- Numero au format IMM-AAAA-NNNN, attribue par la base.
  devis_number      text not null unique
                      default ('IMM-' || to_char(now(), 'YYYY') || '-' ||
                               lpad(nextval('devis_number_seq')::text, 4, '0')),

  -- Client
  client_nom        text not null,
  client_tel        text,
  client_email      text,
  client_ville      text,

  -- Bien
  type_bien         text,
  type_bien_autre   text,
  superficie        text,

  -- Chiffrage
  tour3d_price      numeric(12,2) not null default 0,
  options_selected  text,
  options_total     numeric(12,2) not null default 0,
  hebergement_duree text,
  hebergement_price numeric(12,2) not null default 0,
  subtotal          numeric(12,2) not null default 0,
  remise_pct        numeric(5,2)  not null default 0,
  remise_amt        numeric(12,2) not null default 0,
  total_ttc         numeric(12,2) not null default 0,

  -- Suivi
  notes             text,
  validite_jours    integer,
  auto_pricing_used boolean not null default false,
  statut            text not null default 'En attente',

  -- Rattachement optionnel a un lead existant. Pas de cle etrangere : leadId
  -- na pas de contrainte unique cote table leads, une FK echouerait.
  lead_id           text,

  -- PDF archive dans le bucket Storage "devis", deja utilise par l upload
  -- de devis depuis la fiche lead.
  pdf_url           text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Liste du dashboard : tri par date, filtre par statut.
create index if not exists devis_created_idx on public.devis (created_at desc);
create index if not exists devis_statut_idx  on public.devis (statut);
create index if not exists devis_lead_idx    on public.devis (lead_id);

-- Meme posture que les autres tables : RLS actif sans policy publique, tout
-- passe par la cle service_role cote serveur du dashboard.
alter table public.devis enable row level security;
