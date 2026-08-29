/**
 * scripts/migrate-vocabulaire-2026-08-29.mjs — Migration des DONNÉES vers le
 * vocabulaire unique (types/vocabulaire.ts). Ne touche pas au schéma (le DDL
 * est dans scripts/sql/2026-08-29_archivage_lead_links.sql).
 *
 *   node scripts/migrate-vocabulaire-2026-08-29.mjs           → dry-run (montre tout, n'écrit rien)
 *   node scripts/migrate-vocabulaire-2026-08-29.mjs --apply   → applique
 *
 * 1. leads.typeDeBien   : anciens libellés → vocabulaire (Cabinet Médical → Médical…)
 * 2. leads.ville        : orthographes normalisées (Kenitra → Kénitra…)
 * 3. tours.sector       : slugs anglais → slugs canoniques (clinic → medical…)
 * 4. portfolio.deliverables : options du devis, Panoramas HDR et Vidéo retirés
 * 5. portfolio bouznika : surface 70 m² → 60 m² (la vraie valeur, cf. meta)
 * 6. revalidation du cache immersio.ma (tags portfolio)
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("env manquante");
  process.exit(1);
}
const sb = createClient(url, key);
const log = (...a) => console.log(APPLY ? "[APPLY]" : "[DRY]  ", ...a);

// ── 1. leads.typeDeBien ─────────────────────────────────────────────────────
const TYPE_MAP = {
  "Cabinet Médical": "Médical",
  Ecole: "Écoles",
  École: "Écoles",
  Bureau: "Bureaux",
};
// ── 2. leads.ville ──────────────────────────────────────────────────────────
const VILLE_MAP = {
  Kenitra: "Kénitra",
  Tangier: "Tanger",
  fès: "Fès",
  fes: "Fès",
  Fes: "Fès",
  meknes: "Meknès",
  Meknes: "Meknès",
  Marrakesh: "Marrakech",
  marrakech: "Marrakech",
  agadir: "Agadir",
};

{
  const { data: leads, error } = await sb.from("leads").select("leadId,typeDeBien,ville");
  if (error) throw error;
  for (const l of leads) {
    const patch = {};
    if (l.typeDeBien && TYPE_MAP[l.typeDeBien]) patch.typeDeBien = TYPE_MAP[l.typeDeBien];
    if (l.ville && VILLE_MAP[l.ville]) patch.ville = VILLE_MAP[l.ville];
    if (Object.keys(patch).length === 0) continue;
    log(`lead ${l.leadId}: ${JSON.stringify(patch)} (avant: ${l.typeDeBien} / ${l.ville})`);
    if (APPLY) {
      const { error: e } = await sb.from("leads").update(patch).eq("leadId", l.leadId);
      if (e) throw e;
    }
  }
}

// ── 3. tours.sector ─────────────────────────────────────────────────────────
const SECTOR_MAP = {
  hotel: "hotels",
  showroom: "showrooms",
  museum: "autre", // « Musées » retiré du vocabulaire (décision 29/08)
  gym: "sport",
  clinic: "medical",
  event: "evenementiel",
  restaurant: "autre",
};
{
  const { data: tours, error } = await sb.from("tours").select("id,slug,sector");
  if (error) throw error;
  for (const t of tours) {
    const next = t.sector && SECTOR_MAP[t.sector];
    if (!next) continue;
    log(`tour ${t.slug}: sector ${t.sector} → ${next}`);
    if (APPLY) {
      const { error: e } = await sb.from("tours").update({ sector: next }).eq("id", t.id);
      if (e) throw e;
    }
  }
}

// ── 4 + 5. portfolio ────────────────────────────────────────────────────────
// Livrables : mapping ancien → nouveau ; null = retiré (décision : Panoramas
// HDR et Vidéo disparaissent du site partout).
const DELIV_MAP = {
  "Visite 3D": "Visite 3D",
  "3D Tour": "3D Tour",
  "Plan 2D": "Plan 2D / Floor Plan",
  "2D Plan": "2D Floor Plan",
  "2D Floor Plan": "2D Floor Plan",
  "Panoramas HDR": null,
  "HDR Panoramas": null,
  Vidéo: null,
  Video: null,
};
const GMAPS = {
  French: "Publication Google Maps (Google Business Profile)",
  English: "Google Maps Publication (Google Business Profile)",
};

const touchedSlugs = new Set();
{
  const { data: projs, error } = await sb
    .from("portfolio_projects")
    .select("id,slug,language,surface,deliverables,meta_title");
  if (error) throw error;
  for (const p of projs) {
    const patch = {};

    // Livrables
    const before = Array.isArray(p.deliverables) ? p.deliverables : [];
    const after = [];
    for (const d of before) {
      if (d === "Google Street View") {
        after.push(GMAPS[p.language] ?? GMAPS.French);
        continue;
      }
      if (d in DELIV_MAP) {
        const mapped = DELIV_MAP[d];
        if (mapped) after.push(mapped);
        continue; // null → retiré
      }
      after.push(d); // inconnu → conservé tel quel
    }
    const changed = JSON.stringify(before) !== JSON.stringify(after);
    if (changed) patch.deliverables = after;

    // Surface Bouznika : 60 m² (la valeur des meta, confirmée le 29/08)
    if (
      (p.slug === "appartement-bouznika" || p.slug === "bouznika-apartment") &&
      p.surface !== "60 m²"
    ) {
      patch.surface = "60 m²";
    }

    if (Object.keys(patch).length === 0) continue;
    touchedSlugs.add(p.slug);
    log(`portfolio ${p.language === "French" ? "fr" : "en"}/${p.slug}:`);
    if (patch.deliverables)
      log(`   livrables: ${JSON.stringify(before)} → ${JSON.stringify(after)}`);
    if (patch.surface) log(`   surface: ${p.surface} → 60 m²`);
    if (APPLY) {
      patch.updated_at = new Date().toISOString();
      const { error: e } = await sb.from("portfolio_projects").update(patch).eq("id", p.id);
      if (e) throw e;
    }
  }
}

// ── 6. Revalidation immersio.ma ─────────────────────────────────────────────
if (APPLY && touchedSlugs.size > 0) {
  const endpoint = process.env.SITE_REVALIDATE_URL;
  const secret = process.env.REVALIDATION_SECRET;
  if (endpoint && secret) {
    const tags = ["portfolio", ...[...touchedSlugs].map((s) => `portfolio-${s}`)];
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-revalidate-secret": secret },
      body: JSON.stringify({ tags }),
    });
    console.log(`revalidation → HTTP ${res.status} (${tags.length} tags)`);
  } else {
    console.warn("SITE_REVALIDATE_URL / REVALIDATION_SECRET absents — revalider manuellement.");
  }
}

console.log(
  APPLY
    ? "\nMigration appliquée."
    : "\nDry-run terminé — rien n'a été écrit. Relancer avec --apply."
);
