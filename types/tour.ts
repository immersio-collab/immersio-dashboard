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

export const TOUR_SECTORS = [
  { 
    value: "immobilier", 
    label: "Immobilier", 
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    dotColor: "bg-blue-600"
  },
  { 
    value: "restaurant", 
    label: "Restaurant", 
    badgeColor: "bg-amber-50 text-amber-800 border-amber-300",
    dotColor: "bg-amber-500"
  },
  { 
    value: "hotel", 
    label: "Hôtel", 
    badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-300",
    dotColor: "bg-emerald-600"
  },
  { 
    value: "showroom", 
    label: "Showroom", 
    badgeColor: "bg-purple-50 text-purple-800 border-purple-300",
    dotColor: "bg-purple-600"
  },
  { 
    value: "museum", 
    label: "Musée / Galerie", 
    badgeColor: "bg-pink-50 text-pink-800 border-pink-300",
    dotColor: "bg-pink-600"
  },
  { 
    value: "clinic", 
    label: "Clinique / Santé", 
    badgeColor: "bg-teal-50 text-teal-800 border-teal-300",
    dotColor: "bg-teal-600"
  },
  { 
    value: "gym", 
    label: "Salle de sport", 
    badgeColor: "bg-orange-50 text-orange-800 border-orange-300",
    dotColor: "bg-orange-600"
  },
  { 
    value: "event", 
    label: "Événementiel", 
    badgeColor: "bg-indigo-50 text-indigo-800 border-indigo-300",
    dotColor: "bg-indigo-600"
  },
  { 
    value: "autre", 
    label: "Autre", 
    badgeColor: "bg-slate-100 text-slate-700 border-slate-300",
    dotColor: "bg-slate-500"
  },
] as const;

export type TourSectorValue = typeof TOUR_SECTORS[number]["value"];

