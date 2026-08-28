/**
 * lib/devis-pdf.ts — Quotation PDF, ported from immersio-devis.
 *
 * The layout is reproduced millimetre for millimetre: same palette, same card
 * geometry, same wording. The one structural change is the input — the original
 * read every value from the DOM at draw time, which is why it could not render
 * a preview of anything but the live form. It now takes a DevisData object, so
 * the same function serves the live preview, the download and any future
 * server-side render.
 *
 * Returns the jsPDF document rather than saving it: callers choose between
 * `.save(name)` and `.output("bloburl")` for the preview iframe.
 */

import { jsPDF } from "jspdf";
import {
  DEVIS_OPTIONS,
  HEBERGEMENT_DUREES,
  type DevisData,
  type DevisOptionId,
} from "@/types";
import {
  computeTotals,
  pdfFmt,
  prolongationRate,
  superficieLabel,
  typeBienLabel,
} from "@/lib/devis-pricing";

type RGB = [number, number, number];

export function buildDevisPdf(data: DevisData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const W = 210;
  const H = 297;
  const ML = 15;
  const MR = 15;
  const MT = 15;
  const CW = W - ML - MR;
  let y = MT;

  // Premium monochromatic palette.
  const BG: RGB = [248, 248, 250];
  const DARK_C: RGB = [16, 16, 20];
  const WHITE_C: RGB = [255, 255, 255];
  const MUTED_C: RGB = [138, 138, 154];
  const BORDER_C: RGB = [219, 218, 217];
  const SILVER: RGB = [197, 198, 206];

  function roundedCard(
    x: number,
    cy: number,
    w: number,
    h: number,
    fill: RGB | null = BG,
    stroke: RGB | null = BORDER_C,
    radius = 3
  ) {
    if (fill) doc.setFillColor(...fill);
    if (stroke) {
      doc.setDrawColor(...stroke);
      doc.setLineWidth(0.3);
    }
    doc.roundedRect(x, cy, w, h, radius, radius, fill && stroke ? "FD" : fill ? "F" : "D");
  }

  function text(
    t: string,
    x: number,
    tx: number,
    opts: { size?: number; color?: RGB; bold?: boolean; italic?: boolean; align?: "left" | "center" | "right" } = {}
  ) {
    doc.setFontSize(opts.size || 9);
    doc.setTextColor(...(opts.color || DARK_C));
    doc.setFont("helvetica", opts.bold ? "bold" : opts.italic ? "italic" : "normal");
    doc.text(t, x, tx, { align: opts.align || "left" });
  }

  function hline(ly: number, color: RGB = BORDER_C) {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.2);
    doc.line(ML + 0.5, ly, W - MR - 0.5, ly);
  }

  const totals = computeTotals(data);

  // ── 1. Header banner ──────────────────────────────────────────────────────
  roundedCard(ML, y, CW, 20, DARK_C, null, 3.5);
  text("Immersio.", ML + 6, y + 7.5, { bold: true, size: 15, color: WHITE_C });
  text("Vos clients visitent en ligne. Ils réservent. Ils achètent.", ML + 6, y + 13.2, {
    size: 7.2,
    color: SILVER,
    italic: true,
  });

  const devisNum = data.devisNumber || "N° DEVIS";
  const today = new Date().toLocaleDateString("fr-FR");
  const validite = String(data.validiteJours || 30);

  text("DEVIS COMMERCIAL", W - MR - 6, y + 6.5, { bold: true, size: 10.5, align: "right", color: WHITE_C });
  text(devisNum, W - MR - 6, y + 10.8, { size: 7.8, bold: true, align: "right", color: WHITE_C });
  text(`Date : ${today}  ·  Validité : ${validite} jours`, W - MR - 6, y + 14.8, {
    size: 6.8,
    color: SILVER,
    align: "right",
  });

  y += 24;

  // ── 2. Client and property cards ──────────────────────────────────────────
  const cardW = (CW - 6) / 2;

  // Truncated rather than wrapped: these cards have a fixed height, and an
  // overflowing name would spill outside the border.
  const trunc = (v: string, max: number) => (v.length > max ? v.substring(0, max - 3) + "..." : v);
  const nom = trunc(data.clientNom || "—", 40);
  const tel = data.clientTel || "—";
  const email = trunc(data.clientEmail || "—", 35);
  const ville = trunc(data.clientVille || "—", 40);

  roundedCard(ML, y, cardW, 28, BG, BORDER_C, 3);
  text("INFORMATIONS CLIENT", ML + 5, y + 4.5, { size: 6.8, bold: true, color: MUTED_C });
  text("Nom / Établissement", ML + 5, y + 9.5, { size: 6, color: MUTED_C });
  text(nom, ML + 5, y + 13.5, { size: 8, bold: true });
  text("Contact & Adresse", ML + 5, y + 18.5, { size: 6, color: MUTED_C });
  text(`${tel}  ·  ${email}`, ML + 5, y + 22.2, { size: 7.5 });
  text(ville, ML + 5, y + 25.8, { size: 7.5 });

  roundedCard(ML + cardW + 6, y, cardW, 28, BG, BORDER_C, 3);
  text("CARACTÉRISTIQUES DU BIEN", ML + cardW + 11, y + 4.5, { size: 6.8, bold: true, color: MUTED_C });
  text("Type de bien", ML + cardW + 11, y + 9.5, { size: 6, color: MUTED_C });
  text(typeBienLabel(data), ML + cardW + 11, y + 13.5, { size: 8, bold: true });
  text("Superficie du bien", ML + cardW + 11, y + 18.5, { size: 6, color: MUTED_C });
  const superfText = data.superficieOverride ?? (data.superficie ? superficieLabel(data.superficie) : "—");
  text(superfText, ML + cardW + 11, y + 22.5, {
    size: 8,
    bold: true,
  });

  y += 33;

  // ── 3. Services and options ───────────────────────────────────────────────
  text("PRESTATIONS & OPTIONS DÉTAILLÉES", ML, y, { size: 7.2, bold: true, color: MUTED_C });

  const selected = DEVIS_OPTIONS.filter((o) => data.options.includes(o.id as DevisOptionId));
  const extras = data.extraOptions ?? [];
  const activeRows = 1 + selected.length + extras.length; // 1 for the base tour

  const tableY = y + 4.5;
  const rowH = 8.5;
  const topPad = 4.5;
  const botPad = 4.5;
  const tableH = topPad + activeRows * rowH + botPad - 1.5;

  roundedCard(ML, tableY, CW, tableH, BG, BORDER_C, 3);

  let rowY = tableY + topPad + 2.5;
  let rowIndex = 0;

  function optRow(label: string, desc: string, isSelected: boolean, showTotal = false, total = 0) {
    doc.setFillColor(...(isSelected ? DARK_C : MUTED_C));
    doc.circle(ML + 6, rowY - 0.8, 0.75, "F");

    text(label, ML + 10.5, rowY - 0.7, {
      size: 7.5,
      bold: isSelected,
      color: isSelected ? DARK_C : MUTED_C,
    });
    text(desc, ML + 10.5, rowY + 2.7, { size: 5.8, color: MUTED_C });

    if (showTotal) {
      text(total > 0 ? pdfFmt(total) + " MAD" : "—", W - MR - 6, rowY - 0.6, {
        size: 8,
        bold: true,
        align: "right",
        color: DARK_C,
      });
    }

    if (rowIndex < activeRows - 1) hline(rowY + 4.8, [232, 233, 238]);

    rowY += rowH;
    rowIndex++;
  }

  optRow(
    "Tour 3D Interactif",
    "Visite virtuelle immersive 3D, lien de partage et code d'intégration web",
    true,
    true,
    totals.tour3d
  );
  selected.forEach((opt) => optRow(opt.label, opt.desc, true));
  // Reprints of older quotations: label only, no description to invent.
  extras.forEach((label) => optRow(label, "", true));

  y = tableY + tableH + 6;

  // ── 4. Hosting ────────────────────────────────────────────────────────────
  text("HÉBERGEMENT DE LA VISITE VIRTUELLE", ML, y, { size: 7.2, bold: true, color: MUTED_C });

  const hebY = y + 4.2;
  const hebH = 20;
  roundedCard(ML, hebY, CW, hebH, WHITE_C, BORDER_C, 3);

  const cellW = 32.8;
  HEBERGEMENT_DUREES.forEach((d, i) => {
    const isSelected = data.hebergementDuree === d.value;
    const px = ML + 3 + i * (cellW + 2.5);
    const hprice = data.hebergementPrices[d.value] || 0;

    if (isSelected) {
      roundedCard(px, hebY + 3.5, cellW, 13, DARK_C, null, 2);
      text(d.label, px + cellW / 2, hebY + 8, { size: 7.8, bold: true, align: "center", color: WHITE_C });
      text(hprice > 0 ? pdfFmt(hprice) + " MAD" : "— MAD", px + cellW / 2, hebY + 13, {
        size: 7,
        align: "center",
        color: SILVER,
        bold: true,
      });
    } else {
      roundedCard(px, hebY + 3.5, cellW, 13, BG, BORDER_C, 2);
      text(d.label, px + cellW / 2, hebY + 8, { size: 7.5, align: "center", color: MUTED_C });
      text(hprice > 0 ? pdfFmt(hprice) + " MAD" : "— MAD", px + cellW / 2, hebY + 13, {
        size: 6.8,
        align: "center",
        color: MUTED_C,
      });
    }
  });

  // Renewal and infrastructure notes, only once a duration carrying a
  // preferential rate is chosen.
  const rate = data.hebergementDuree ? prolongationRate(data.hebergementDuree) : 0;
  if (rate > 0) {
    const durLabel = HEBERGEMENT_DUREES.find((d) => d.value === data.hebergementDuree)?.label ?? "";
    const startY = hebY + hebH + 3.5;
    text(
      `• Prolongation : À l'échéance des ${durLabel}, prolongation au tarif préférentiel de ${rate} MAD / mois supplémentaire.`,
      ML + 2,
      startY,
      { size: 6, italic: true, color: MUTED_C }
    );
    text(
      "• Infrastructure : Intégration possible sur votre site, mais serveur dédié 3D requis pour le moteur d'affichage (Vercel / hébergement classique non compatible).",
      ML + 2,
      startY + 3.2,
      { size: 6, italic: true, color: MUTED_C }
    );
  }

  y = hebY + hebH + (data.hebergementDuree ? 11 : 6);

  // ── 5. Notes and payment terms ────────────────────────────────────────────
  const ncW = (CW - 6) / 2;
  const ncH = 24;

  const notesVal = data.notes.trim();
  roundedCard(ML, y, ncW, ncH, BG, BORDER_C, 3);
  text("NOTES / REMARQUES", ML + 5, y + 4.5, { size: 6.5, bold: true, color: MUTED_C });
  if (notesVal) {
    const lines: string[] = doc.splitTextToSize(notesVal, ncW - 10);
    lines.slice(0, 4).forEach((l, i) => text(l, ML + 5, y + 9.5 + i * 3.5, { size: 6.5 }));
  } else {
    text("Aucune remarque spécifique à signaler.", ML + 5, y + 9.5, { size: 6.5, color: MUTED_C, italic: true });
    text("Exécution selon la charte qualité standard d'Immersio.", ML + 5, y + 14, {
      size: 6.5,
      color: MUTED_C,
      italic: true,
    });
  }

  roundedCard(ML + ncW + 6, y, ncW, ncH, BG, BORDER_C, 3);
  text("CONDITIONS DE RÈGLEMENT", ML + ncW + 11, y + 4.5, { size: 6.5, bold: true, color: MUTED_C });
  text("· Acompte : 50% à la signature du devis", ML + ncW + 11, y + 9.5, { size: 6.8 });
  text("· Solde : 50% à la livraison finale du projet", ML + ncW + 11, y + 13.8, { size: 6.8 });
  text("· Délai : De 48h à une semaine ouvrée", ML + ncW + 11, y + 18.1, { size: 6.8 });
  text(`· Devis valable pendant ${validite} jours`, ML + ncW + 11, y + 22.4, { size: 6.2, color: MUTED_C });

  y += ncH + 5;

  // ── 6. Totals ─────────────────────────────────────────────────────────────
  const hasRemise = data.remisePct > 0;
  const totH = hasRemise ? 26 : 19;
  roundedCard(ML, y, CW, totH, BG, BORDER_C, 3);

  text("Sous-total HT", ML + 6, y + 6.5, { size: 7.5, color: MUTED_C });
  text(pdfFmt(totals.subtotal) + " MAD", W - MR - 6, y + 6.5, { size: 7.8, bold: true, align: "right" });

  if (hasRemise) {
    text(`Remise (${data.remisePct}%)`, ML + 6, y + 11.8, { size: 7.5, color: MUTED_C });
    text("— " + pdfFmt(totals.remiseAmt) + " MAD", W - MR - 6, y + 11.8, {
      size: 7.8,
      color: [180, 80, 60],
      bold: true,
      align: "right",
    });
  }

  // Dark strip: rounded rectangle then a plain one over its top edge, so the
  // strip has square corners on top and rounded ones at the card's base.
  const stripY = y + (hasRemise ? 14.5 : 7.5);
  const stripH = y + totH - stripY;
  doc.setFillColor(...DARK_C);
  doc.roundedRect(ML, stripY, CW, stripH, 3, 3, "F");
  doc.rect(ML, stripY, CW, stripH - 2.5, "F");
  doc.setDrawColor(...BORDER_C);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, CW, totH, 3, 3, "D");

  const stripMid = stripY + stripH / 2 + 1.2;
  text("TOTAL NET HT", ML + 6, stripMid, { size: 9, bold: true, color: WHITE_C });
  text(pdfFmt(totals.total) + " MAD", W - MR - 6, stripMid, {
    size: 10.5,
    bold: true,
    color: WHITE_C,
    align: "right",
  });

  // ── 7. Footer ─────────────────────────────────────────────────────────────
  const footerLineY = H - 18;
  hline(footerLineY);
  text(
    "Immersio.  ·  immersio.ma  ·  contact@immersio.ma  ·  +212 708 71 72 77  ·  Rabat, Maroc",
    W / 2,
    footerLineY + 4.5,
    { size: 7.5, color: MUTED_C, align: "center" }
  );
  text("Ce document est généré électroniquement. Devis non contractuel.", W / 2, footerLineY + 9, {
    size: 6.5,
    color: MUTED_C,
    italic: true,
    align: "center",
  });

  return doc;
}

/** Filename used for the download, matching the original convention. */
export function devisFileName(data: DevisData): string {
  const client = (data.clientNom || "client").replace(/\s+/g, "_");
  const today = new Date().toLocaleDateString("fr-FR").replace(/\//g, "-");
  return `Devis_Immersio_${client}_${today}.pdf`;
}
