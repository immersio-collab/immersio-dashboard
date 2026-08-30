/**
 * types/vocabulaire.ts — Source unique du vocabulaire métier.
 *
 * Chaque module (leads, devis, portfolio, tours) et le formulaire de contact
 * d'immersio.ma décrivaient les mêmes notions avec leurs propres listes,
 * recopiées puis divergées. Ce fichier est désormais LA référence : secteurs,
 * villes, tranches de surface et livrables. Le site consomme les mêmes
 * libellés (src/lib/contact-labels.ts côté immersio.ma est aligné mot pour
 * mot — toute modification ici doit y être répercutée).
 *
 * Décisions (29/08/2026, validées par le propriétaire) :
 *   - 10 secteurs, coefficient devis inclus (l'ancien barème par type de bien
 *     est remplacé : Appartement/Villa/Résidence fusionnent en Immobilier).
 *   - 6 villes + « Autre » (saisie libre).
 *   - 5 tranches de surface ; « Plus de 500 m² » n'a pas de coefficient :
 *     le prix du tour se saisit manuellement (sur devis).
 *   - Les livrables du portfolio sont les options du devis (+ la Visite 3D
 *     elle-même) : ce qui est vendu et ce qui est montré portent le même nom.
 */

// ---------------------------------------------------------------------------
// Secteurs (types de bien)
// ---------------------------------------------------------------------------

export interface Secteur {
  /** Slug canonique, partagé avec le portfolio du site et ses filtres. */
  value: string;
  /** Libellé français — la valeur stockée sur les leads. */
  fr: string;
  /** Libellé anglais — utilisé par les contenus en langue anglaise. */
  en: string;
  /** Multiplicateur appliqué au prix de base du tour 3D dans le devis. */
  coef: number;
}

export const SECTEURS: ReadonlyArray<Secteur> = [
  { value: "immobilier", fr: "Immobilier", en: "Real Estate", coef: 1.15 },
  { value: "medical", fr: "Médical", en: "Medical", coef: 1.2 },
  { value: "ecoles", fr: "Écoles", en: "Schools", coef: 1.25 },
  { value: "bureaux", fr: "Bureaux", en: "Offices", coef: 1.15 },
  { value: "evenementiel", fr: "Événementiel", en: "Events", coef: 1.4 },
  { value: "hotels", fr: "Hôtels", en: "Hotels", coef: 1.45 },
  { value: "riads", fr: "Riads", en: "Riads", coef: 1.35 },
  { value: "sport", fr: "Sport", en: "Sports", coef: 1.25 },
  { value: "showrooms", fr: "Showrooms", en: "Showrooms", coef: 1.2 },
  { value: "autre", fr: "Autre", en: "Other", coef: 1.4 },
] as const;

/** Libellés français hors « Autre » — les selects des leads ajoutent leur propre mécanisme Autre. */
export const SECTEUR_LABELS_FR: ReadonlyArray<string> = SECTEURS.filter(
  (s) => s.value !== "autre"
).map((s) => s.fr);

/** Retrouve un secteur par libellé (fr ou en), insensible à la casse/aux accents. */
export function findSecteurByLabel(label: string | null | undefined): Secteur | undefined {
  if (!label) return undefined;
  const norm = normalise(label);
  return SECTEURS.find((s) => normalise(s.fr) === norm || normalise(s.en) === norm);
}

// ---------------------------------------------------------------------------
// Villes
// ---------------------------------------------------------------------------

/**
 * Villes proposées dans les selects, par volume commercial. Toute autre ville
 * passe par « Autre » (champ libre) — le select des leads sait réafficher une
 * valeur hors liste.
 */
export const VILLES: ReadonlyArray<string> = [
  "Rabat",
  "Casablanca",
  "Kénitra",
  "Tanger",
  "Fès",
  "Meknès",
] as const;

// ---------------------------------------------------------------------------
// Tranches de surface
// ---------------------------------------------------------------------------

export interface Superficie {
  value: string;
  /** Libellé exact — le formulaire du site envoie la même chaîne. */
  label: string;
  /** null = pas de calcul automatique : prix du tour saisi manuellement. */
  coef: number | null;
}

export const SUPERFICIES: ReadonlyArray<Superficie> = [
  { value: "lt50", label: "Moins de 50 m²", coef: 1.0 },
  { value: "50_100", label: "50 – 100 m²", coef: 1.3 },
  { value: "100_200", label: "100 – 200 m²", coef: 1.6 },
  { value: "200_500", label: "200 – 500 m²", coef: 2.0 },
  { value: "gt500", label: "Plus de 500 m²", coef: null },
] as const;

/** Retrouve une tranche par libellé, tolérant sur les espaces/tirets/accents. */
export function findSuperficieByLabel(label: string | null | undefined): Superficie | undefined {
  if (!label) return undefined;
  const norm = normalise(label);
  return SUPERFICIES.find((s) => normalise(s.label) === norm);
}

// ---------------------------------------------------------------------------
// Livrables — partagés entre le devis (options vendues) et le portfolio
// (livrables affichés sur immersio.ma)
// ---------------------------------------------------------------------------

export interface Livrable {
  id: string;
  fr: string;
  en: string;
  /**
   * Description imprimée sous l'option dans le PDF du devis. Vide pour ce qui
   * n'est pas une option facturable.
   */
  desc?: string;
  /**
   * false pour la visite elle-même : elle est le produit, pas une option à
   * cocher dans un devis. Elle reste un livrable affichable au portfolio.
   */
  facturable?: boolean;
}

export const LIVRABLES: ReadonlyArray<Livrable> = [
  { id: "visite3d", fr: "Visite 3D", en: "3D Tour", facturable: false },
  {
    id: "photos",
    fr: "Photos HD extraites du tour",
    en: "HD Photos from the tour",
    desc: "Sélection de photographies professionnelles HD extraites de la visite",
    facturable: true,
  },
  {
    id: "plan2d",
    fr: "Plan 2D / Floor Plan",
    en: "2D Floor Plan",
    desc: "Plan d'architecte 2D de l'espace avec mesures et agencement",
    facturable: true,
  },
  {
    id: "tags",
    fr: "Points interactifs",
    en: "Interactive tags",
    desc: "Points d'intérêt cliquables (textes, images et liens d'information)",
    facturable: true,
  },
  {
    id: "branding",
    fr: "Branding Personnalisé",
    en: "Custom Branding",
    desc: "Intégration de votre logo, couleurs et coordonnées dans l'interface",
    facturable: true,
  },
  {
    id: "gmaps",
    fr: "Publication Google Maps (Google Business Profile)",
    en: "Google Maps Publication (Google Business Profile)",
    desc: "Publication directe de la visite sur Google Maps et Street View",
    facturable: true,
  },
  {
    id: "integration",
    fr: "Intégration sur site web",
    en: "Website integration",
    desc: "Intégration facile sur votre site web (WordPress, Wix ou sur-mesure)",
    facturable: true,
  },
  {
    id: "guide",
    fr: "Guide d'intégration",
    en: "Integration guide",
    desc: "Guide complet avec liens et modèles de partage sur WhatsApp et réseaux sociaux.",
    facturable: true,
  },
] as const;

/** Les livrables vendus en option dans un devis — la visite en est exclue. */
export const LIVRABLES_FACTURABLES = LIVRABLES.filter((l) => l.facturable);

// ---------------------------------------------------------------------------
// Listes propres aux leads (statuts, canaux) — centralisées ici pour mettre
// fin aux trois copies divergentes des composants leads.
// ---------------------------------------------------------------------------

export const STATUT_OPTIONS: ReadonlyArray<string> = [
  "Nouveau",
  "Contacté",
  "Intéressé",
  "Négociation",
  "Gagné",
  "Perdu",
  "En pause",
] as const;

export const CANAL_OPTIONS: ReadonlyArray<string> = [
  "Instagram",
  "Facebook",
  "WhatsApp",
  "Référence",
  "Site web",
  "Autre",
] as const;

export const STATUS_STYLES: Record<string, string> = {
  Nouveau: "bg-blue-50 text-blue-700 border-blue-200",
  Contacté: "bg-slate-50 text-slate-700 border-slate-200",
  Intéressé: "bg-amber-50 text-amber-700 border-amber-200",
  Négociation: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Gagné: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Perdu: "bg-rose-50 text-rose-700 border-rose-200",
  "En pause": "bg-yellow-50 text-yellow-800 border-yellow-200",
};

// ---------------------------------------------------------------------------
// Utilitaire de comparaison
// ---------------------------------------------------------------------------

/** Minuscules, sans accents, tirets unifiés, espaces réduits. */
export function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}
