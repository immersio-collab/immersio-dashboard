/**
 * types/devis.ts — Domain types for quotations.
 *
 * Ported from immersio-devis.vercel.app, whose form state lived in the DOM and
 * whose records lived in a Google Sheet. The field names follow the Sheet's
 * columns so the existing rows can be imported without a mapping table.
 */

import { SECTEURS, SUPERFICIES } from "./vocabulaire";

export type DevisStatut = "En attente" | "Accepté" | "Refusé";

export const DEVIS_STATUTS: ReadonlyArray<DevisStatut> = ["En attente", "Accepté", "Refusé"];

/**
 * Property types, with the multiplier applied to the base 3D tour price.
 *
 * Derived from the shared vocabulary (types/vocabulaire.ts) so the quotation
 * speaks the same language as the leads, the portfolio and the contact form.
 * The historical Appartement/Villa/Résidence split is gone: older quotations
 * reprint faithfully through the `typeBienAutre` fallback in devis-record.ts.
 */
export const TYPE_BIEN_OPTIONS: ReadonlyArray<{ value: string; label: string; coef: number }> =
  SECTEURS.map((s) => ({ value: s.value, label: s.fr, coef: s.coef }));

/**
 * Surface brackets, with their multiplier.
 *
 * `coef: null` (Plus de 500 m²) means the 3D tour price is typed manually —
 * "sur devis" — instead of being derived from the base price.
 */
export const SUPERFICIE_OPTIONS: ReadonlyArray<{
  value: string;
  label: string;
  coef: number | null;
}> = SUPERFICIES.map((s) => ({ value: s.value, label: s.label, coef: s.coef }));

/**
 * Add-on options. `label` and `desc` are printed verbatim in the PDF, so they
 * are data rather than UI copy — changing one changes every future quotation.
 */
export const DEVIS_OPTIONS = [
  {
    id: "photos",
    label: "Photos HD extraites du tour",
    desc: "Sélection de photographies professionnelles HD extraites de la visite",
  },
  {
    id: "plan2d",
    label: "Plan 2D / Floor Plan",
    desc: "Plan d'architecte 2D de l'espace avec mesures et agencement",
  },
  {
    id: "tags",
    label: "Points interactifs",
    desc: "Points d'intérêt cliquables (textes, images et liens d'information)",
  },
  {
    id: "branding",
    label: "Branding Personnalisé",
    desc: "Intégration de votre logo, couleurs et coordonnées dans l'interface",
  },
  {
    id: "gmaps",
    label: "Publication Google Maps (Google Business Profile)",
    desc: "Publication directe de la visite sur Google Maps et Street View",
  },
  {
    id: "integration",
    label: "Intégration sur site web",
    desc: "Intégration facile sur votre site web (WordPress, Wix ou sur-mesure)",
  },
  {
    id: "guide",
    label: "Guide d'intégration",
    desc: "Guide complet avec liens et modèles de partage sur WhatsApp et réseaux sociaux.",
  },
] as const;

export type DevisOptionId = (typeof DEVIS_OPTIONS)[number]["id"];

/**
 * Hosting durations.
 *
 * `prolongation` is the preferential monthly rate offered once the period
 * expires, printed as a note in the PDF. `autoRatio` and `autoFloor` drive
 * the suggested price: max(floor, round(tour3dPrice * ratio)). Both sets of
 * figures are the originals from immersio-devis — they are commercial terms,
 * not defaults to be reinvented.
 */
export const HEBERGEMENT_DUREES = [
  { value: "1", label: "1 mois", prolongation: 150, autoRatio: 0.12, autoFloor: 150 },
  { value: "3", label: "3 mois", prolongation: 100, autoRatio: 0.2, autoFloor: 200 },
  { value: "6", label: "6 mois", prolongation: 50, autoRatio: 0.3, autoFloor: 250 },
  { value: "12", label: "12 mois", prolongation: 45, autoRatio: 0.45, autoFloor: 350 },
  { value: "24", label: "24 mois", prolongation: 35, autoRatio: 0.65, autoFloor: 500 },
] as const;

/** Discount applied by default, as in the original form. */
export const REMISE_AUTO_PCT = 10;

/** Row as stored. */
export interface DevisRecord {
  id: string;
  devis_number: string;
  client_nom: string;
  client_tel: string | null;
  client_email: string | null;
  client_ville: string | null;
  type_bien: string | null;
  type_bien_autre: string | null;
  superficie: string | null;
  tour3d_price: number;
  options_selected: string | null;
  options_total: number;
  hebergement_duree: string | null;
  hebergement_price: number;
  subtotal: number;
  remise_pct: number;
  remise_amt: number;
  total_ttc: number;
  notes: string | null;
  validite_jours: number | null;
  auto_pricing_used: boolean;
  statut: string;
  lead_id: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Everything the PDF needs, decoupled from both the database row and the form
 * state so the preview can render a quotation that has not been saved yet.
 */
export interface DevisData {
  devisNumber: string | null;
  clientNom: string;
  clientTel: string;
  clientEmail: string;
  clientVille: string;
  typeBien: string;
  typeBienAutre: string;
  superficie: string;
  /** Exact surface wording of a saved quotation, printed as-is when set. */
  superficieOverride?: string;
  /** Base price before the type and surface multipliers. */
  basePrice: number;
  /**
   * Manually typed 3D tour price, used when the surface bracket has no
   * coefficient ("Plus de 500 m²" — sur devis). Ignored otherwise.
   */
  tour3dManualPrice: number;
  /**
   * Exact tour price of a saved quotation.
   *
   * A stored record keeps the computed price but not the base price and
   * coefficients behind it, and those coefficients may since have changed.
   * When set, it is used verbatim instead of being recomputed — a reprint
   * must show the figures the client was quoted.
   */
  tour3dOverride?: number;
  options: DevisOptionId[];
  /**
   * Option labels that no longer match a known id.
   *
   * Quotations imported from the Sheet list options under wording that has
   * since changed ("Vidéo HD (MP4)", "Tags interactifs"). Dropping them would
   * silently reprint a lighter quotation than the client received.
   */
  extraOptions?: string[];
  hebergementDuree: string;
  /** Price per duration, keyed by month count ("1", "3", "6", "12", "24"). */
  hebergementPrices: Record<string, number>;
  remisePct: number;
  notes: string;
  validiteJours: number;
}

export type DevisInsert = Omit<DevisRecord, "id" | "devis_number" | "created_at" | "updated_at"> &
  Partial<Pick<DevisRecord, "devis_number">>;

export type DevisUpdate = Partial<Omit<DevisRecord, "id" | "devis_number" | "created_at">>;
