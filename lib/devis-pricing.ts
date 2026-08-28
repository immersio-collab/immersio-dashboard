/**
 * lib/devis-pricing.ts — Quotation pricing engine.
 *
 * Ported unchanged from immersio-devis: the 3D tour price is a base amount
 * multiplied by a property-type coefficient and a surface-bracket coefficient.
 * Kept as pure functions so the form, the PDF and the saved record all compute
 * the same figures from the same input — the original recomputed them in three
 * places from DOM state.
 */

import {
  TYPE_BIEN_OPTIONS,
  SUPERFICIE_OPTIONS,
  DEVIS_OPTIONS,
  HEBERGEMENT_DUREES,
  type DevisData,
  type DevisOptionId,
} from "@/types";

export function typeCoef(value: string): number {
  return TYPE_BIEN_OPTIONS.find((t) => t.value === value)?.coef ?? 1;
}

export function superficieCoef(value: string): number {
  return SUPERFICIE_OPTIONS.find((s) => s.value === value)?.coef ?? 1;
}

/** Monthly rate offered once the chosen hosting period expires. */
export function prolongationRate(duree: string): number {
  return HEBERGEMENT_DUREES.find((d) => d.value === duree)?.prolongation ?? 0;
}

export function typeBienLabel(data: Pick<DevisData, "typeBien" | "typeBienAutre">): string {
  if (data.typeBien === "autre" && data.typeBienAutre.trim()) return data.typeBienAutre.trim();
  return TYPE_BIEN_OPTIONS.find((t) => t.value === data.typeBien)?.label ?? "—";
}

export function superficieLabel(value: string): string {
  return SUPERFICIE_OPTIONS.find((s) => s.value === value)?.label ?? "—";
}

export function optionLabel(id: DevisOptionId): string {
  return DEVIS_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

/** Base price × type coefficient × surface coefficient, rounded. */
export function tour3dPrice(data: DevisData): number {
  return Math.round(data.basePrice * typeCoef(data.typeBien) * superficieCoef(data.superficie));
}

export function hebergementPrice(data: DevisData): number {
  if (!data.hebergementDuree) return 0;
  return data.hebergementPrices[data.hebergementDuree] || 0;
}

export interface DevisTotals {
  tour3d: number;
  hebergement: number;
  subtotal: number;
  remiseAmt: number;
  total: number;
}

/**
 * Computes the quotation totals.
 *
 * The add-on options carry no price of their own: the original priced them
 * into the tour, and the PDF lists them without amounts. That behaviour is
 * preserved — changing it would change every quotation figure.
 */
export function computeTotals(data: DevisData): DevisTotals {
  const tour3d = tour3dPrice(data);
  const hebergement = hebergementPrice(data);
  const subtotal = tour3d + hebergement;
  const remiseAmt = (subtotal * data.remisePct) / 100;
  return {
    tour3d,
    hebergement,
    subtotal,
    remiseAmt,
    total: subtotal - remiseAmt,
  };
}

/** French number formatting used on screen and, after cleanup, in the PDF. */
export function fmt(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/**
 * Same formatting, safe for jsPDF.
 *
 * fr-FR separates thousands with U+202F (narrow no-break space), which jsPDF
 * reads as character spacing and renders as digits flung apart. Replaced with
 * a plain space before any doc.text() call.
 */
export function pdfFmt(n: number): string {
  return fmt(n).replace(/ /g, " ");
}

/** Empty quotation, used to seed the creation form. */
export function emptyDevis(): DevisData {
  return {
    devisNumber: null,
    clientNom: "",
    clientTel: "",
    clientEmail: "",
    clientVille: "",
    typeBien: "",
    typeBienAutre: "",
    superficie: "",
    basePrice: 0,
    options: [],
    hebergementDuree: "",
    hebergementPrices: { "1": 0, "3": 0, "6": 0, "12": 0, "24": 0 },
    remisePct: 0,
    notes: "",
    validiteJours: 30,
  };
}
