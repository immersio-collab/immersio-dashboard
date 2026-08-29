-- ============================================================================
-- 2026-08-29 — Archivage (soft-delete) + liens vers les leads
--
-- À exécuter dans Supabase : SQL Editor → New query → coller → Run.
-- Idempotent : peut être relancé sans risque.
--
-- Pourquoi : « Supprimer » dans le dashboard archive désormais (la ligne
-- reste en base, elle n'est plus affichée). Et les devis / projets portfolio
-- peuvent être liés à un lead (client).
--
-- Le code déployé fonctionne AVANT comme APRÈS ce script (les filtres
-- archived sont appliqués côté application) — mais les boutons « Archiver »
-- et le lien « Client (lead) » du portfolio échoueront tant que ces colonnes
-- n'existent pas. Exécuter ce script en premier.
-- ============================================================================

-- Soft-delete sur les quatre tables qui n'en avaient pas.
-- (La table leads garde son mécanisme existant : colonne "archive" texte.)
alter table public.devis              add column if not exists archived boolean not null default false;
alter table public.blog_posts         add column if not exists archived boolean not null default false;
alter table public.portfolio_projects add column if not exists archived boolean not null default false;
alter table public.tours              add column if not exists archived boolean not null default false;

-- Lien portfolio → lead (client pour lequel le projet a été réalisé).
-- (devis.lead_id existe déjà.)
alter table public.portfolio_projects add column if not exists lead_id text;

-- Index sur les filtres les plus fréquents.
create index if not exists devis_archived_idx      on public.devis (archived);
create index if not exists blog_archived_idx       on public.blog_posts (archived);
create index if not exists portfolio_archived_idx  on public.portfolio_projects (archived);
create index if not exists tours_archived_idx      on public.tours (archived);
create index if not exists devis_lead_idx          on public.devis (lead_id);
create index if not exists portfolio_lead_idx      on public.portfolio_projects (lead_id);
