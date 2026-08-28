/**
 * types/devis.ts — Domain types for quotations.
 *
 * Ported from immersio-devis.vercel.app, whose form state lived in the DOM and
 * whose records lived in a Google Sheet. The field names follow the Sheet's
 * columns so the existing rows can be imported without a mapping table.
 */

export type DevisStatut = "En attente" | "Accepté" | "Refusé";

export const DEVIS_STATUTS: ReadonlyArray<DevisStatut> = ["En attente", "Accepté", "Refusé"];

/** Property types, with the multiplier applied to the base 3D tour price. */
export const TYPE_BIEN_OPTIONS = [
  { value: "appartement", label: "Appartement", coef: 1.0 },
  { value: "villa", label: "Villa", coef: 1.15 },
  { value: "showroom", label: "Showroom", coef: 1.2 },
  { value: "salle_sport", label: "Salle de sport", coef: 1.25 },
  { value: "riad", label: "Riad", coef: 1.35 },
  { value: "residence", label: "Résidence", coef: 1.4 },
  { value: "evenementiel", label: "Événementiel", coef: 1.4 },
  { value: "hotel", label: "Hôtel", coef: 1.45 },
  { value: "autre", label: "Autre", coef: 1.4 },
] as const;

/** Surface brackets, with their multiplier. */
export const SUPERFICIE_OPTIONS = [
  { value: "<50", label: "Moins de 50 m²", coef: 1.0 },
  { value: "50-100", label: "50 – 100 m²", coef: 1.3 },
  { value: "100-200", label: "100 – 200 m²", coef: 1.6 },
  { value: "200-500", label: "200 – 500 m²", coef: 2.0 },
  { value: "500-1000", label: "500 – 1000 m²", coef: 2.6 },
  { value: ">1000", label: "Plus de 1000 m²", coef: 3.5 },
] as const;

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

/** Hosting durations, in months, and the monthly renewal rate after expiry. */
export const HEBERGEMENT_DUREES = [
  { value: "1", label: "1 mois", prolongation: 0 },
  { value: "3", label: "3 mois", prolongation: 180 },
  { value: "6", label: "6 mois", prolongation: 150 },
  { value: "12", label: "12 mois", prolongation: 120 },
  { value: "24", label: "24 mois", prolongation: 90 },
] as const;

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
  /** Base price before the type and surface multipliers. */
  basePrice: number;
  options: DevisOptionId[];
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
