/**
 * lib/devis-record.ts — Turns a saved quotation back into printable data.
 *
 * Reprinting a quotation is not the same as recomputing one. The stored row
 * keeps the figures the client was quoted; the coefficients behind them may
 * have moved since, and the rows imported from the Google Sheet never carried
 * a base price at all. So the amounts are taken verbatim and only the labels
 * are mapped back onto the current vocabulary.
 */

import {
  DEVIS_OPTIONS,
  HEBERGEMENT_DUREES,
  SUPERFICIE_OPTIONS,
  TYPE_BIEN_OPTIONS,
  type DevisData,
  type DevisOptionId,
  type DevisRecord,
} from "@/types";
import { emptyDevis } from "@/lib/devis-pricing";

/** Compares labels ignoring case, accents and dash variants. */
function loose(a: string): string {
  return a
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[–—]/g, "-")
    // "100–200 m²" and "100 – 200 m²" are the same bracket under two spacings.
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function devisDataFromRecord(record: DevisRecord): DevisData {
  const typeMatch = TYPE_BIEN_OPTIONS.find(
    (t) => record.type_bien && loose(t.label) === loose(record.type_bien)
  );
  const superfMatch = SUPERFICIE_OPTIONS.find(
    (s) => record.superficie && loose(s.label) === loose(record.superficie)
  );

  // The Sheet joined the option labels with " + ". Those that still map to a
  // known id keep their description; the rest are printed as plain labels.
  const labels = (record.options_selected ?? "")
    .split("+")
    .map((s) => s.trim())
    .filter(Boolean);

  const options: DevisOptionId[] = [];
  const extraOptions: string[] = [];
  for (const label of labels) {
    const known = DEVIS_OPTIONS.find((o) => loose(o.label) === loose(label));
    if (known) options.push(known.id as DevisOptionId);
    else extraOptions.push(label);
  }

  const duree = HEBERGEMENT_DUREES.find(
    (d) => record.hebergement_duree && loose(d.label) === loose(record.hebergement_duree)
  );

  // Only the chosen duration's price was recorded. The others print as "—",
  // which is honest: inventing them would put figures in front of a client
  // that were never quoted.
  const hebergementPrices = { ...emptyDevis().hebergementPrices };
  if (duree) hebergementPrices[duree.value] = Number(record.hebergement_price || 0);

  return {
    devisNumber: record.devis_number,
    clientNom: record.client_nom ?? "",
    clientTel: record.client_tel ?? "",
    clientEmail: record.client_email ?? "",
    clientVille: record.client_ville ?? "",
    // An unrecognised type keeps its wording through the "autre" free field.
    typeBien: typeMatch?.value ?? (record.type_bien ? "autre" : ""),
    typeBienAutre: typeMatch ? (record.type_bien_autre ?? "") : (record.type_bien ?? ""),
    superficie: superfMatch?.value ?? "",
    // Faithful reprint: an unmatched bracket keeps the exact wording that was
    // quoted rather than printing an em dash.
    superficieOverride: superfMatch ? undefined : (record.superficie ?? undefined),
    basePrice: 0,
    tour3dOverride: Number(record.tour3d_price || 0),
    options,
    extraOptions: extraOptions.length ? extraOptions : undefined,
    hebergementDuree: duree?.value ?? "",
    hebergementPrices,
    remisePct: Number(record.remise_pct || 0),
    notes: record.notes ?? "",
    validiteJours: record.validite_jours ?? 30,
  };
}
