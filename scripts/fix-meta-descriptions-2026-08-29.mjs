/**
 * scripts/fix-meta-descriptions-2026-08-29.mjs — Réécrit les descriptions SEO
 * trop courtes des articles et des projets publiés.
 *
 *   node scripts/fix-meta-descriptions-2026-08-29.mjs           → dry-run
 *   node scripts/fix-meta-descriptions-2026-08-29.mjs --apply   → applique + revalide
 *
 * Ces pages n'avaient pas de meta_description propre : le site retombait sur
 * la première phrase de l'article, une amorce de récit de 70 à 118 caractères
 * qui laissait la moitié de l'espace du résultat Google inutilisé — et, pour
 * l'une d'elles, laissait fuiter du markdown (**riad 3D au Maroc**).
 *
 * Chaque texte ci-dessous est écrit à partir du contenu réel de la page et
 * vise 140–158 caractères, le budget avant troncature.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/** [table, slug, langue, nouvelle description] */
const REWRITES = [
  // ── Articles (français) ───────────────────────────────────────────────────
  [
    "blog_posts",
    "comment-attirer-plus-de-clients-pour-votre-salle-des-fetes",
    "French",
    "Les couples choisissent leur salle des fêtes en ligne, souvent sans la visiter. Comment une visite virtuelle 3D vous place en tête de leur comparatif.",
  ],
  [
    "blog_posts",
    "comment-augmenter-les-reservations-de-votre-hotel-au-maroc",
    "French",
    "Vos futurs clients comparent dix hôtels sans quitter leur canapé. Comment une visite virtuelle 3D lève leurs doutes et fait basculer la réservation.",
  ],
  [
    "blog_posts",
    "creation-dun-tour-virtuel-guide-etape-par-etape",
    "French",
    "De la définition des objectifs au lien prêt à intégrer sur votre site : les étapes réelles d'une visite virtuelle professionnelle, sans mauvaise surprise.",
  ],
  [
    "blog_posts",
    "reservations-hotel-3d-comment-la-technologie-booste-vos",
    "French",
    "Les hôtels équipés d'une visite immersive enregistrent en moyenne 48 % de réservations en plus. Comment la 3D agit sur la décision, et sur le revenu net.",
  ],
  [
    "blog_posts",
    "riad-3d-au-maroc-12-exemples-de-visites-virtuelles",
    "French",
    "Douze riads marocains à explorer en visite virtuelle 3D : patios, zelliges et terrasses. De quoi comprendre ce qui déclenche une réservation à distance.",
  ],
  [
    "blog_posts",
    "tour-interactif-magasin-boostez-vos-ventes-en-2026",
    "French",
    "Vos clients décident avant de franchir la porte. Un tour interactif ouvre votre magasin 24h/24 et transforme les curieux en acheteurs qualifiés.",
  ],
  [
    "blog_posts",
    "tour-virtuel-riad-methode-48-h-pour-plus-de-reservations",
    "French",
    "Échelle, circulation, atmosphère : ce qu'une photo ne montre jamais d'un riad. La méthode en 48 h pour mettre votre visite en ligne et convertir plus.",
  ],
  [
    "blog_posts",
    "visite-virtuelle-riad-tout-voir-avant-de-reserver",
    "French",
    "Chambre vraiment spacieuse ? Patio calme ? Escalier praticable ? La visite virtuelle répond aux questions que les photos d'un riad laissent en suspens.",
  ],
  [
    "blog_posts",
    "3d-scan-vs-photo-quelle-option-pour-presenter-votre-espace",
    "French",
    "Scan 3D ou photographie professionnelle : coût, délai, usage et effet sur la conversion. Le comparatif pour choisir selon votre espace et votre objectif.",
  ],
  [
    "blog_posts",
    "comment-vendre-plus-avec-une-visite-3d-pour-showroom-maroc",
    "French",
    "Soixante pour cent des acheteurs consultent en ligne avant de se déplacer. Comment un showroom virtuel capte ces clients et déclenche des demandes de devis.",
  ],

  // ── Projets portfolio ─────────────────────────────────────────────────────
  [
    "portfolio_projects",
    "fitness-club",
    "French",
    "Visitez le Fitness Club Elite d'Agadir en 3D avant de vous inscrire : 800 m² d'équipements, espace piscine et vestiaires, explorés librement en ligne.",
  ],
  [
    "portfolio_projects",
    "fitness-club",
    "English",
    "Tour the 800 m² Fitness Club Elite in Agadir in 3D before you sign up: training floor, pool area and changing rooms, explored freely online at any time.",
  ],
  [
    "portfolio_projects",
    "villa-moderne-casablanca",
    "French",
    "Découvrez une villa de 450 m² du quartier Anfa à Casablanca en visite virtuelle 3D : espaces décloisonnés, cuisine design et jardins, en immersion totale.",
  ],
  [
    "portfolio_projects",
    "modern-villa-anfa",
    "English",
    "Explore a 450 m² villa in the Anfa district of Casablanca with an interactive 3D tour: open-plan living spaces, designer kitchen and landscaped gardens.",
  ],
  [
    "portfolio_projects",
    "clinique-identist",
    "French",
    "Visitez la clinique dentaire iDentist d'Essaouira en visite virtuelle 3D : salle d'attente, zones de stérilisation et cabinets de soin, pour venir serein.",
  ],
  [
    "portfolio_projects",
    "showroom-mobilier-casa",
    "French",
    "Parcourez 350 m² de collections de mobilier à Casablanca en visite virtuelle 3D : un showroom ouvert 24h/24, avec plan 2D et mesures prises à distance.",
  ],
];

const MIN = 140;
const MAX = 158;
let refus = 0;

for (const [table, slug, language, description] of REWRITES) {
  const n = description.length;
  const horsBudget = n < MIN || n > MAX;
  const flag = horsBudget ? "  ⚠ HORS BUDGET" : "";
  console.log(`[${String(n).padStart(3)}] ${language === "French" ? "fr" : "en"}/${slug}${flag}`);
  if (horsBudget) {
    refus++;
    continue;
  }
  if (APPLY) {
    const { error, count } = await sb
      .from(table)
      .update({ meta_description: description, updated_at: new Date().toISOString() }, { count: "exact" })
      .eq("slug", slug)
      .eq("language", language);
    if (error) throw error;
    if (count === 0) console.warn(`   ↳ aucune ligne mise à jour pour ${slug} (${language})`);
  }
}

if (refus > 0) {
  console.error(`\n${refus} description(s) hors budget — corriger le texte avant d'appliquer.`);
  process.exit(1);
}

if (APPLY) {
  const endpoint = process.env.SITE_REVALIDATE_URL;
  const secret = process.env.REVALIDATION_SECRET;
  if (endpoint && secret) {
    const tags = ["blog", "portfolio", ...REWRITES.map(([t, slug]) => `${t === "blog_posts" ? "blog" : "portfolio"}-${slug}`)];
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-revalidate-secret": secret },
      body: JSON.stringify({ tags: [...new Set(tags)] }),
    });
    console.log(`\nrevalidation → HTTP ${res.status}`);
  }
}

console.log(APPLY ? "\nDescriptions réécrites." : "\nDry-run — rien n'a été écrit. Relancer avec --apply.");
process.exit(0);
