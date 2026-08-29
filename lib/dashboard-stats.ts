/**
 * lib/dashboard-stats.ts — Chiffres transverses de la vue d'ensemble.
 *
 * La page d'accueil ne montrait que les leads, alors que le dashboard gère
 * cinq domaines : le chiffre d'affaires en cours, les brouillons à publier et
 * les visites hors ligne n'apparaissaient nulle part.
 *
 * Chaque fonction ne lit que les colonnes dont elle a besoin et ne lève
 * jamais : un module indisponible affiche un tiret, il ne fait pas tomber la
 * page d'accueil des quatre autres.
 */

import { getSupabaseClient } from "@/lib/supabase";
import { todayISO } from "@/lib/publication";

export interface ModuleStats {
  /** Contenus datés du futur, qui partiront seuls. */
  blogProgrammes: number;
  portfolioProgrammes: number;
  /** Devis en attente de réponse client, et leur montant cumulé. */
  devisEnAttente: number;
  devisMontantEnAttente: number;
  devisAcceptesMontant: number;
  /** Articles et projets encore en brouillon. */
  blogBrouillons: number;
  portfolioBrouillons: number;
  /** Visites virtuelles créées mais non publiées sur le site. */
  toursInactifs: number;
  /** Modules dont la lecture a échoué — affichés en « — » plutôt qu'en 0. */
  indisponibles: string[];
}

const EMPTY: ModuleStats = {
  blogProgrammes: 0,
  portfolioProgrammes: 0,
  devisEnAttente: 0,
  devisMontantEnAttente: 0,
  devisAcceptesMontant: 0,
  blogBrouillons: 0,
  portfolioBrouillons: 0,
  toursInactifs: 0,
  indisponibles: [],
};

export async function getModuleStats(): Promise<ModuleStats> {
  const supabase = getSupabaseClient();
  const stats: ModuleStats = { ...EMPTY, indisponibles: [] };

  // ── Devis : montants par statut ──────────────────────────────────────────
  try {
    const { data, error } = await supabase.from("devis").select("statut, total_ttc, archived");
    if (error) throw error;
    for (const d of data ?? []) {
      if (d.archived) continue;
      const montant = Number(d.total_ttc || 0);
      if (d.statut === "En attente") {
        stats.devisEnAttente++;
        stats.devisMontantEnAttente += montant;
      } else if (d.statut === "Accepté") {
        stats.devisAcceptesMontant += montant;
      }
    }
  } catch {
    stats.indisponibles.push("devis");
  }

  // ── Brouillons blog et portfolio, visites hors ligne ─────────────────────
  // `count: "exact", head: true` ne rapatrie aucune ligne : seul le total
  // traverse le réseau.
  const counters: Array<[string, () => PromiseLike<{ count: number | null; error: unknown }>]> = [
    [
      "blog",
      () =>
        supabase
          .from("blog_posts")
          .select("*", { count: "exact", head: true })
          .neq("status", "Published")
          .eq("archived", false),
    ],
    [
      "blogProgrammes",
      () =>
        supabase
          .from("blog_posts")
          .select("*", { count: "exact", head: true })
          .eq("status", "Published")
          .eq("archived", false)
          .gt("published_date", todayISO()),
    ],
    [
      "portfolio",
      () =>
        supabase
          .from("portfolio_projects")
          .select("*", { count: "exact", head: true })
          .neq("status", "Published")
          .eq("archived", false),
    ],
    [
      "portfolioProgrammes",
      () =>
        supabase
          .from("portfolio_projects")
          .select("*", { count: "exact", head: true })
          .eq("status", "Published")
          .eq("archived", false)
          .gt("published_at", todayISO()),
    ],
    [
      "tours",
      () =>
        supabase
          .from("tours")
          .select("*", { count: "exact", head: true })
          .eq("active", false)
          .eq("archived", false),
    ],
  ];

  const results = await Promise.all(
    counters.map(async ([name, run]) => {
      try {
        const { count, error } = await run();
        if (error) throw error;
        return [name, count ?? 0] as const;
      } catch {
        return [name, null] as const;
      }
    })
  );

  for (const [name, count] of results) {
    if (count === null) {
      stats.indisponibles.push(name);
      continue;
    }
    if (name === "blog") stats.blogBrouillons = count;
    if (name === "blogProgrammes") stats.blogProgrammes = count;
    if (name === "portfolio") stats.portfolioBrouillons = count;
    if (name === "portfolioProgrammes") stats.portfolioProgrammes = count;
    if (name === "tours") stats.toursInactifs = count;
  }

  return stats;
}
