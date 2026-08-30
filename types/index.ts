/**
 * Barrel export for all domain types.
 *
 * Each feature area has its own file:
 *   types/lead.ts        — Lead, LeadStatut, LeadAlert, ...
 *   types/portfolio.ts   — (future) PortfolioItem, ...
 *   types/blog.ts        — (future) BlogPost, ...
 *   types/tours.ts       — (future) Tour, ...
 *
 * Import from "@/types" for convenience, or directly from the sub-file
 * when you only need one domain type.
 */

export type {
  Lead,
  LeadCanal,
  LeadTypeBien,
  LeadStatut,
  LeadDoublon,
  LeadAlert,
  LeadAlertKind,
  PaginationMeta,
  ListResponse,
} from "./lead";

export type {
  Tour,
  TourInsert,
  TourUpdate,
  TourSectorValue,
} from "./tour";

export type {
  BlogPost,
  BlogPostRecord,
  BlogPostInsert,
  BlogPostUpdate,
  BlogSlugEntry,
  BlogLanguage,
} from "./blog";

export type {
  PortfolioProject,
  PortfolioProjectRecord,
  PortfolioProjectInsert,
  PortfolioProjectUpdate,
  PortfolioSlugEntry,
  PortfolioLanguage,
  PortfolioSector,
} from "./portfolio";

export type {
  DevisRecord,
  DevisInsert,
  DevisUpdate,
  DevisData,
  DevisStatut,
  DevisOptionId,
} from "./devis";

export {
  DEVIS_STATUTS,
  DEVIS_OPTIONS,
  TYPE_BIEN_OPTIONS,
  SUPERFICIE_OPTIONS,
  HEBERGEMENT_DUREES,
  REMISE_AUTO_PCT,
} from "./devis";

export { PORTFOLIO_SECTORS } from "./portfolio";
export { TOUR_SECTORS } from "./tour";

export type { Secteur, Superficie, Livrable } from "./vocabulaire";
export {
  SECTEURS,
  SECTEUR_LABELS_FR,
  VILLES,
  SUPERFICIES,
  LIVRABLES,
  LIVRABLES_FACTURABLES,
  STATUT_OPTIONS,
  CANAL_OPTIONS,
  STATUS_STYLES,
  findSecteurByLabel,
  findSuperficieByLabel,
  normalise,
} from "./vocabulaire";

