/**
 * Lead type — mirrors the columns of the "Suivi Leads" Google Sheet.
 *
 * All date fields are stored as ISO-8601 strings (YYYY-MM-DD or
 * YYYY-MM-DDTHH:mm:ss) as returned by the Apps Script back-end.
 * Empty cells come back as an empty string "".
 *
 * Naming convention: camelCase in TypeScript, mapped from the French
 * column headers in the sheet by the server-side fetch helpers in
 * lib/leads.ts.
 *
 * Extension pattern for other data types:
 *   - types/portfolio.ts  →  PortfolioItem, PortfolioStatus
 *   - types/blog.ts       →  BlogPost, BlogStatus
 *   - types/tours.ts      →  Tour, TourStatus
 */

// ---------------------------------------------------------------------------
// Sub-types / unions used by Lead
// ---------------------------------------------------------------------------

/**
 * Canal d'acquisition du lead.
 * Garder en sync avec les valeurs de la liste déroulante dans le sheet.
 */
export type LeadCanal =
  | "Instagram"
  | "Facebook"
  | "WhatsApp"
  | "Référence"
  | "Site web"
  | "Autre"
  | "";

/**
 * Type de bien immobilier visité.
 */
export type LeadTypeBien =
  | "Appartement"
  | "Villa"
  | "Bureau"
  | "Local commercial"
  | "Terrain"
  | "Résidence"
  | "Cabinet"
  | "Hôtel"
  | "Riad"
  | "Autre"
  | "";

/**
 * Statut global de la relation commerciale.
 * Les valeurs correspondent exactement aux choix du sheet.
 */
export type LeadStatut =
  | "Nouveau"
  | "Contacté"
  | "Intéressé"
  | "Négociation"
  | "Gagné"
  | "Perdu"
  | "En pause"
  | "";

/**
 * Valeur de la colonne "Doublon".
 * "⚠ Doublon" signale un doublon non résolu dans le sheet.
 */
export type LeadDoublon = "⚠ Doublon" | "";

// ---------------------------------------------------------------------------
// Lead — main interface
// ---------------------------------------------------------------------------

/**
 * Représentation complète d'un lead tel que retourné par le back-end
 * Apps Script. Les champs optionnels (?) correspondent aux cellules
 * qui peuvent être vides dans le sheet.
 *
 * Colonnes du sheet "Suivi Leads" (ordre fidèle) :
 *   LeadID | Nom | Téléphone | Canal | Ville | Type de bien | Surface |
 *   Date formulaire | Doublon | Date 1er contact | Appel téléphonique |
 *   Statut | Contacté sur WhatsApp | Devis envoyé | Démo envoyé |
 *   Prix proposé (MAD) | Date dernier échange | Relance 1 (auto) |
 *   Relance 2 (auto) | Relance 3 (auto) | Notes | Archivé
 */
export interface Lead {
  /** Identifiant unique généré côté Apps Script (ex: "L-001"). */
  leadId: string;

  /** Nom complet du prospect. */
  nom: string;

  /** Numéro de téléphone (format libre, peut inclure l'indicatif). */
  telephone: string;

  /** Canal d'acquisition. */
  canal: LeadCanal;

  /** Ville du prospect. */
  ville: string;

  /** Type de bien concerné par la visite virtuelle. */
  typeDeBien: LeadTypeBien;

  /** Surface en m² (stockée comme chaîne pour préserver le format du sheet). */
  surface: string;

  /**
   * Date de soumission du formulaire (ISO string).
   * Référence temporelle de base pour calculer les alertes.
   */
  dateFormulaire: string;

  /**
   * Indicateur de doublon.
   * "⚠ Doublon" = doublon détecté et non résolu.
   */
  doublon: LeadDoublon;

  /** Date du premier contact effectif (vide si jamais contacté). */
  date1erContact: string;

  /** "Oui" | "Non" | "" — appel téléphonique passé. */
  appelTelephonique: string;

  /** Statut commercial courant. */
  statut: LeadStatut;

  /** "Oui" | "Non" | "" — contact via WhatsApp. */
  contacteSurWhatsapp: string;

  /** "Oui" | "Non" | "" — devis envoyé. */
  devisEnvoye: string;

  /** "Oui" | "Non" | "" — démo/visite virtuelle envoyée. */
  demoEnvoye: string;

  /**
   * Prix proposé en MAD.
   * Stocké comme chaîne (peut contenir des séparateurs de milliers).
   */
  prixProposeMAD: string;

  /** Date du dernier échange (ISO string, vide si aucun). */
  dateDeEchange: string;

  /**
   * Date de la 1ère relance automatique (ISO string).
   * Calculée côté Apps Script selon la date formulaire.
   */
  relance1Auto: string;

  /** Date de la 2e relance automatique. */
  relance2Auto: string;

  /** Date de la 3e relance automatique. */
  relance3Auto: string;

  /** Notes libres saisies par l'agent. */
  notes: string;

  /**
   * "TRUE" | "FALSE" | "" — soft-delete.
   * Les leads archivés ne sont plus retournés par getLeads().
   */
  archive: string;
}

// ---------------------------------------------------------------------------
// Alert types — produced by getLeadAlerts() in lib/leads.ts
// ---------------------------------------------------------------------------

export type LeadAlertKind =
  | "relance-en-retard"
  | "doublon-non-resolu"
  | "jamais-contacte";

export interface LeadAlert {
  kind: LeadAlertKind;
  /** Human-readable description shown in the UI. */
  message: string;
}

// ---------------------------------------------------------------------------
// Re-usable generic types (shared with future data types)
// ---------------------------------------------------------------------------

export interface PaginationMeta {
  total: number;
  page: number;
  perPage: number;
}

export interface ListResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
