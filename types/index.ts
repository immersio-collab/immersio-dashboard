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
export { TOUR_SECTORS } from "./tour";

