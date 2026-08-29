/**
 * types/tour.ts — Domain types for the Virtual Tours feature.
 */

export interface Tour {
  id: string;
  slug: string;
  property_name: string;
  client_name: string | null;
  sector: string | null;
  realsee_url: string | null;
  active: boolean;
  iframe: string | null;
  /** Soft-delete : true = retiré du dashboard et du site, conservé en base. */
  archived?: boolean;
  created_at: string;
  updated_at: string;
}

export type TourInsert = {
  slug: string;
  property_name: string;
  client_name?: string | null;
  sector?: string | null;
  realsee_url?: string | null;
  active?: boolean;
  iframe?: string | null;
};

export type TourUpdate = Partial<TourInsert>;

import { SECTEURS } from "./vocabulaire";

/** Couleurs de badge par secteur (slug canonique du vocabulaire partagé). */
const SECTOR_BADGES: Record<string, { badgeColor: string; dotColor: string }> = {
  immobilier: { badgeColor: "bg-blue-50 text-blue-700 border-blue-200", dotColor: "bg-blue-600" },
  medical: { badgeColor: "bg-teal-50 text-teal-800 border-teal-300", dotColor: "bg-teal-600" },
  ecoles: { badgeColor: "bg-cyan-50 text-cyan-800 border-cyan-300", dotColor: "bg-cyan-600" },
  bureaux: { badgeColor: "bg-sky-50 text-sky-800 border-sky-300", dotColor: "bg-sky-600" },
  evenementiel: {
    badgeColor: "bg-indigo-50 text-indigo-800 border-indigo-300",
    dotColor: "bg-indigo-600",
  },
  hotels: {
    badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-300",
    dotColor: "bg-emerald-600",
  },
  riads: { badgeColor: "bg-rose-50 text-rose-800 border-rose-300", dotColor: "bg-rose-600" },
  sport: {
    badgeColor: "bg-orange-50 text-orange-800 border-orange-300",
    dotColor: "bg-orange-600",
  },
  showrooms: {
    badgeColor: "bg-purple-50 text-purple-800 border-purple-300",
    dotColor: "bg-purple-600",
  },
  autre: { badgeColor: "bg-slate-100 text-slate-700 border-slate-300", dotColor: "bg-slate-500" },
};

/**
 * Secteurs des tours — dérivés du vocabulaire partagé.
 * Les anciens slugs anglais (museum, gym, clinic, event, restaurant) ont été
 * migrés en base vers les slugs canoniques le 29/08/2026.
 */
export const TOUR_SECTORS: ReadonlyArray<{
  value: string;
  label: string;
  badgeColor: string;
  dotColor: string;
}> = SECTEURS.map((s) => ({
  value: s.value,
  label: s.fr,
  badgeColor: SECTOR_BADGES[s.value]?.badgeColor ?? SECTOR_BADGES.autre.badgeColor,
  dotColor: SECTOR_BADGES[s.value]?.dotColor ?? SECTOR_BADGES.autre.dotColor,
}));

export type TourSectorValue = string;

